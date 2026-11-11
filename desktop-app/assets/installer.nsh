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
