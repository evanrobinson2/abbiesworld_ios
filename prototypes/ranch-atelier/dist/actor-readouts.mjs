// Retain DOM identity, selection and focus; unchanged values cause no DOM writes.
export function writeText(node,value){const text=String(value);if(node.textContent!==text)node.textContent=text;}
export function reconcileReadouts(container,rows,nodes){
 const alive=new Set();for(const {id,text}of rows){alive.add(id);let node=nodes.get(id);if(!node){node=document.createElement('p');nodes.set(id,node);container.append(node);}writeText(node,text);}
 for(const [id,node]of nodes)if(!alive.has(id)){node.remove();nodes.delete(id);}
}
