const scenario=new URLSearchParams(location.search).get('scene')==='zombies';
if(scenario){await import('/board3-zombies.mjs');}else{await import('/board3.js');await import('/sandbox-controls.js');}
