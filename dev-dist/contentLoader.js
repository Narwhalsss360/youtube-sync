/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
var browser = chrome;
async function main() {
    await import(/* webpackIgnore: true */ browser.runtime.getURL("content.js"));
    globalThis.contentModule.main();
}
main();

})();

/******/ })()
;