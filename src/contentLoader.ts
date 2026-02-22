import browser = chrome;

async function main() {
  await import(/* webpackIgnore: true */ browser.runtime.getURL("content.js"));
  (globalThis as any).contentModule.main();
}

main()