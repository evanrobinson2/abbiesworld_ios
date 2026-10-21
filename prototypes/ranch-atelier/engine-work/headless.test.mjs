process.env.RANCH_FIXTURE_DIR=new URL('./',import.meta.url).href;
await import('../dist/tests/ranch-engine/headless.test.mjs');
