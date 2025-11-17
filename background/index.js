importScripts(
  "../shared/filePathValidation.js",
  "./logStore.js",
  "./templateStore.js",
  "./applyCode.js",
  "./messageHandlers.js",
  "./reloadState.js"
);

cgptRegisterReloadStateHooks();
cgptRegisterRuntimeMessageHandler();
