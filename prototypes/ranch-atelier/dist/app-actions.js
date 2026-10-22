/* Generic, page-owned commands. No DOM selectors or arbitrary code execution. */
(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function validate(schema, value, path = 'arguments') {
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(path + ' must be an object');
      for (const key of schema.required || []) if (!Object.hasOwn(value,key)) throw Error(path + '.' + key + ' is required');
      for (const [key, item] of Object.entries(value)) {
        if (!Object.hasOwn(schema.properties || {}, key)) throw Error('Unknown argument: ' + key);
        validate(schema.properties[key], item, path + '.' + key);
      }
    } else if (schema.type === 'integer' ? !Number.isInteger(value) : schema.type === 'number' ? !Number.isFinite(value) : typeof value !== schema.type) throw Error(path + ' has an invalid type');
    if (schema.enum && !schema.enum.includes(value)) throw Error(path + ' is not supported');
    if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum) throw Error(path + ' is out of range');
  }
  function createRegistry({ identity, changed = () => {} }) {
    const providers = new Map(), receipts = new Map(); let running = false, lastReceipt = null;
    function register(name, provider) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) throw Error('Invalid provider name');
      if (providers.has(name)) throw Error('Duplicate action provider: ' + name);
      for (const [action, def] of Object.entries(provider.actions)) {
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(action)) throw Error('Invalid action name');
        if (!def.schema || typeof def.run !== 'function') throw Error('Invalid action: ' + action);
      }
      providers.set(name, provider); changed();
    }
    function describe() {
      return { version: 1, target: identity(), running, lastReceipt, providers: [...providers].map(([name,p]) => ({name, revision:p.revision(), actions:Object.entries(p.actions).map(([action,d]) => ({name:name+'.'+action, description:d.description, inputSchema:d.schema, readOnly:!!d.readOnly, disabledReason:p.unavailable?.(action) || null}))})) };
    }
    async function execute(command) {
      const fingerprint = JSON.stringify(command);
      if (receipts.has(command.id)) {
        const old=receipts.get(command.id); if(old.fingerprint!==fingerprint) throw Error('Command ID reused with different arguments'); return clone(old.receipt);
      }
      if (running) throw Error('Another action is running');
      const target=identity();
      for (const key of ['sessionId','documentId','slug','search','buildId']) if (!target[key] || command.target?.[key] !== target[key]) {
        if(key==='search' && target[key]==='' && command.target?.[key]==='') continue;
        throw Error('Target mismatch: '+key);
      }
      if (!target.enabled) throw Error('Actions unavailable: view disconnected, paused or hidden');
      if (!command.id || !Number.isFinite(command.expiresAt) || command.expiresAt < Date.now()) throw Error('Invalid or expired command');
      const dot=command.action?.indexOf('.'), p=providers.get(command.action?.slice(0,dot)), d=p?.actions[command.action?.slice(dot+1)];
      if (!d) throw Error('Unsupported action');
      const before=p.revision();
      if(command.expectedRevision!==before) throw Error('Revision conflict');
      const reason=p.unavailable?.(command.action.slice(dot+1)); if(reason) throw Error(reason);
      validate(d.schema,command.arguments || {});
      running=true; changed();
      let receipt;
      try {
        const result=await d.run(clone(command.arguments || {}));
        receipt={id:command.id,action:command.action,arguments:command.arguments || {},status:'succeeded',beforeRevision:before,afterRevision:p.revision(),result:result ?? null,state:p.read(),completedAt:new Date().toISOString()};
      } catch(error) {
        receipt={id:command.id,action:command.action,status:'failed',beforeRevision:before,afterRevision:p.revision(),error:error.message,completedAt:new Date().toISOString()};
      } finally {running=false;changed();}
      lastReceipt=Object.fromEntries(Object.entries(receipt).filter(([key])=>!['state','result','arguments'].includes(key)));
      receipts.set(command.id,{fingerprint,receipt}); if(receipts.size>100) receipts.delete(receipts.keys().next().value);
      return clone(receipt);
    }
    return {register,describe,execute};
  }
  if (typeof module !== 'undefined') module.exports={createRegistry,validate};
  if (typeof window !== 'undefined') window.RanchActions=createRegistry({identity:()=>window.RanchView?.actionTarget() || {},changed:()=>window.RanchView?.changed()});
})();
