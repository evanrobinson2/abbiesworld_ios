import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from './playthrough.mjs';

function until(p, text) {
  for (let i=0; i<30 && p.open && !p.has(text); i++) p.pick('Continue');
  assert.ok(p.open && p.has(text), `Expected ${text}`);
  return p;
}

test('campaign: training, occupation, recruitment, vault and independent ending', () => {
  const p = new Player(7);
  p.spot('training'); until(p,'Read the mission').pick('Read the mission');
  p.pick('Climb into').pick('Pick a careful'); until(p,'Leave').pick('Leave');
  p.spot('barracks'); p.pick('Sleep until'); until(p,'Plant your').pick('Plant your'); until(p,'Leave').pick('Leave');
  p.spot('training'); p.pick('Read the mission').pick('Accept the duel'); until(p,'Leave').pick('Leave');
  p.winBattle(()=>p.spot('field'),'Mount up'); p.finish();
  p.spot('lounge'); until(p,'Let it slide').pick('Let it slide'); p.finish();
  p.spot('barracks'); p.pick('Sleep until'); until(p,'Leave').pick('Leave');
  p.spot('training'); p.pick('Read the mission').pick('out to the perimeter');
  until(p,'Turn and wave').pick('Turn and wave'); p.finish();
  assert.equal(p.state.mapVariant,'ruined');
  p.spot('outfitter'); p.pick('civilian clothes'); until(p,'Leave').pick('Leave');
  p.city('port'); p.spot('hall'); until(p,'Wait across').pick('Wait across');
  p.pick("Shout your father's"); until(p,'...').pick('...');
  until(p,'Hang the chip').pick('Hang the chip'); p.pick('Run for');
  if(p.has('Down the storm')) p.pick('Down the storm');
  p.finish();
  assert.ok(p.state.flags.mentor_joined);
  p.spot('repair'); p.pick('Ask to apprentice'); until(p,'Welcome him').pick('Welcome him'); p.finish();
  p.city('home'); p.spot('barracks'); p.pick('Play the cracked'); p.finish();
  assert.ok(p.state.flags.saw_damaged_disk);
  p.spot('hospital'); p.pick('Search the medical'); until(p,'Welcome her').pick('Welcome her'); p.finish();
  p.city('hut'); p.spot('door'); until(p,'best mechanic').pick('best mechanic'); until(p,'best medic').pick('best medic');
  until(p,'Look at').pick('Look at'); until(p,'Fire at').pick('Fire at'); until(p,'Thank him').pick('Thank him'); p.finish();
  p.winBattle(()=>p.hex(0,1),'Fight it from','Try again');
  until(p,'Go down').pick('Go down');
  p.room('entry'); p.pick('Open the envelope').pick('Take the red').pick('Back to');
  p.room('maproom'); p.pick('Take the blue'); until(p,'Back to').pick('Back to');
  p.room('workshop'); p.pick('Open the bench'); until(p,'Back to').pick('Back to');
  p.room('hangar'); p.pick('Climb up').pick('Claim the'); p.finish();
  p.room('storeroom'); p.pick('Throw the breakers'); p.finish();
  p.room('relay');
  p.pick('Continue').pick('Red').pick('Red').pick('Red').pick('Red');
  assert.ok(!p.state.flags.code_solved, 'Wrong code must leave the door locked');
  p.pick('Try again').pick('Blue').pick('Yellow').pick('White').pick('Red'); p.finish();
  assert.ok(p.state.flags.code_solved);
  p.room('relay'); p.pick('Call the Regent'); until(p,'Refuse:').pick('Refuse:');
  until(p,'The end').pick('The end');
  assert.equal(p.ended.kind, 'victory');
  assert.equal(p.state.flags.game_won, 1);
  assert.equal(p.state.party.length, 4);
  assert.ok(p.state.flags.found_father_mech);
  assert.ok(p.log.some(b=>b.id==='duel1' && b.result==='win'));
  assert.ok(p.log.some(b=>b.id==='cave_guard' && b.result==='win'));
});


test('ruins award their cache once, and display the discovery on the first visit', () => {
  const p=new Player();
  for (const [scene,amount] of [['hex_oldruins',12],['hex_southruins',25]]) {
    const before=p.state.money;
    p.openScene(scene,{kind:'map'});
    assert.equal(p.view().nodeId,'start');
    p.finish(); p.openScene(scene,{kind:'map'});
    assert.equal(p.view().nodeId,'empty');
    assert.equal(p.state.money,before+amount);
    p.finish();
  }
});
