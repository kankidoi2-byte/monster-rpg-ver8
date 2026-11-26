// jsdom models the open attribute but does not implement the modal methods.
export function installDialogDomSupport(window) {
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal ??= function () { this.open = true; };
  dialog.close ??= function () {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
}
