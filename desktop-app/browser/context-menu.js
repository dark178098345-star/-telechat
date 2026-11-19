'use strict';
const { safePage } = require('./policy');
function showPageMenu(electron, workspace, tab, wc, params = {}) {
  const owner = workspace.profileActive?.id,
    epoch = workspace.profileEpoch;
  const valid = () =>
    workspace.profileEpoch === epoch &&
    workspace.activePage(wc, owner) &&
    tab.view?.webContents === wc;
  if (!valid() || !electron.Menu) return;
  const run = (fn) => () => {
    if (valid()) fn();
  };
  const link = safePage(params.linkURL) ? params.linkURL : '';
  const image = params.mediaType === 'image' && safePage(params.srcURL) ? params.srcURL : '';
  const template = [
    {
      label: 'Назад',
      enabled: wc.navigationHistory.canGoBack(),
      click: run(() => wc.navigationHistory.goBack()),
    },
    {
      label: 'Вперёд',
      enabled: wc.navigationHistory.canGoForward(),
      click: run(() => wc.navigationHistory.goForward()),
    },
    {
      label: 'Обновить страницу',
      accelerator: 'CmdOrCtrl+R',
      click: run(() => workspace.navigate(tab, tab.url)),
    },
  ];
  if (link)
    template.push(
      { type: 'separator' },
      {
        label: 'Открыть ссылку в новой вкладке',
        enabled: workspace.tabs.length < 8,
        click: run(() => workspace.add(link)),
      },
      { label: 'Скопировать ссылку', click: run(() => electron.clipboard.writeText(link)) },
      { label: 'Сохранить файл по ссылке…', click: run(() => wc.downloadURL(link)) },
      {
        label: 'Открыть ссылку в обычном браузере',
        click: run(() => electron.shell.openExternal(link)),
      },
    );
  if (image)
    template.push(
      { type: 'separator' },
      { label: 'Сохранить изображение…', click: run(() => wc.downloadURL(image)) },
      {
        label: 'Скопировать ссылку на изображение',
        click: run(() => electron.clipboard.writeText(image)),
      },
    );
  if (params.isEditable || params.selectionText) {
    template.push({ type: 'separator' });
    if (params.isEditable)
      template.push({
        label: 'Вырезать',
        enabled: !!params.editFlags?.canCut,
        click: run(() => wc.cut()),
      });
    template.push({
      label: 'Копировать',
      enabled: !!params.editFlags?.canCopy || !!params.selectionText,
      click: run(() => wc.copy()),
    });
    if (params.isEditable)
      template.push({
        label: 'Вставить',
        enabled: !!params.editFlags?.canPaste,
        click: run(() => wc.paste()),
      });
    template.push({ label: 'Выделить всё', click: run(() => wc.selectAll()) });
  }
  electron.Menu.buildFromTemplate(template).popup({ window: workspace.host, frame: params.frame });
}
module.exports = { showPageMenu };
