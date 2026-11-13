!include "${__FILEDIR__}\installer-preflight.nsh"
Var ExstraPreflightCode
Var ExstraPreflightOutput
Var ExstraPreflightTarget
Var ExstraPreflightOld
Var ExstraPreflightUser
Var ExstraPreflightPass
!ifndef EXSTRACHAT_PREFLIGHT_WAIT_MS
  !define EXSTRACHAT_PREFLIGHT_WAIT_MS "12000"
!endif

!macro customCheckAppRunning
  ; Do not let the old uninstaller start moving files while any app/helper owns
  ; them. Paths are environment data, never interpolated into PowerShell source.
  StrCpy $ExstraPreflightPass 0
  StrCpy $ExstraPreflightTarget "$INSTDIR"
  StrCpy $ExstraPreflightOld ""
  StrCpy $ExstraPreflightUser ""
  !ifndef BUILD_UNINSTALLER
    ; A manually selected new directory does not replace the old registry path.
    ReadRegStr $ExstraPreflightOld SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    ${if} $installMode == "all"
      ReadRegStr $ExstraPreflightUser HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    ${endif}
  !endif
  exstra_preflight_retry:
  System::Call 'kernel32::SetEnvironmentVariable(t "EXSTRACHAT_PREFLIGHT_DIRECTORY", t "$ExstraPreflightTarget")'
  System::Call 'kernel32::SetEnvironmentVariable(t "EXSTRACHAT_PREFLIGHT_WAIT_MS", t "${EXSTRACHAT_PREFLIGHT_WAIT_MS}")'
  nsExec::ExecToStack /TIMEOUT=25000 '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -EncodedCommand ${EXSTRACHAT_PREFLIGHT_COMMAND}'
  Pop $ExstraPreflightCode
  Pop $ExstraPreflightOutput
  System::Call 'kernel32::SetEnvironmentVariable(t "EXSTRACHAT_PREFLIGHT_DIRECTORY", p 0)'
  System::Call 'kernel32::SetEnvironmentVariable(t "EXSTRACHAT_PREFLIGHT_WAIT_MS", p 0)'
  ${if} $ExstraPreflightCode != 0
    DetailPrint "$ExstraPreflightOutput"
    ${if} $ExstraPreflightCode == 20
      StrCpy $ExstraPreflightOutput "ExstraChat ещё работает. Закрой его полностью, включая окно сайтов. Сворачивание в трей не подходит. Затем нажми «Повторить»."
    ${elseif} $ExstraPreflightCode == 21
      StrCpy $ExstraPreflightOutput "Windows пока не разрешает заменить файлы ExstraChat. Полностью закрой приложение и подожди несколько секунд. Старые файлы ещё не удалялись."
    ${else}
      StrCpy $ExstraPreflightOutput "Не удалось безопасно проверить папку ExstraChat. Установка остановлена до замены файлов. Попробуй запустить установщик из папки «Загрузки»."
      StrCpy $ExstraPreflightCode 22
    ${endif}
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$ExstraPreflightOutput" /SD IDCANCEL IDRETRY exstra_preflight_retry
    SetErrorLevel $ExstraPreflightCode
    Quit
  ${endif}
  ${if} $ExstraPreflightPass == 0
    StrCpy $ExstraPreflightPass 1
    ${if} $ExstraPreflightOld != ""
    ${andIf} $ExstraPreflightOld != $ExstraPreflightTarget
      StrCpy $ExstraPreflightTarget $ExstraPreflightOld
      Goto exstra_preflight_retry
    ${endif}
  ${endif}
  ${if} $ExstraPreflightPass == 1
    StrCpy $ExstraPreflightPass 2
    ${if} $ExstraPreflightUser != ""
    ${andIf} $ExstraPreflightUser != $ExstraPreflightTarget
      StrCpy $ExstraPreflightTarget $ExstraPreflightUser
      Goto exstra_preflight_retry
    ${endif}
  ${endif}
  ClearErrors
!macroend

!macro customInit
  ; electron-builder skips its section check in the elevated inner installer.
  ; Check that branch here too, after the install mode/directory is initialized.
  ${If} ${UAC_IsInnerInstance}
    !insertmacro customCheckAppRunning
  ${EndIf}
!macroend

!macro customInstall
  ; Migration from 1.3.x-1.4.2: their old helper runs /S without --updated
  ; and may be closed by NSIS together with the installed Electron process.
  ; Only this legacy path needs the installer itself to restart the app.
  ${if} ${Silent}
  ${andIfNot} ${isUpdated}
    System::Call 'kernel32::SetEnvironmentVariable(t "ELECTRON_RUN_AS_NODE", p 0)'
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
  ${endIf}
!macroend
