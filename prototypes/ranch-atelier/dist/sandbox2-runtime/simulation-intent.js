// Presentation only: describe recorded actions without inventing plans or emotions.
export function intentFor(actor, frame = {}) {
  const activity = actor.activity || '';
  const job = actor.job !== undefined ? actor.job : actor.task?.job;
  const names = {'abbie-home': "Abbie’s home", 'ani-home': "Ani’s home", shelter:'the horse shelter', feed:'the feed store', water:'the water point', garden:'the garden'};
  const care = [...(frame.careJobs || []), ...(frame.cleaningJobs || [])].find(j => j.id === job);
  const habitat = care?.habitat || (/^build-(habitat-\d+)$/.exec(job || '') || [])[1];
  const resident = frame.animals?.find(a => a.habitat === habitat);
  const destination = names[job] || (habitat ? resident ? `the ${resident.species} habitat` : habitat.replace('habitat-', 'habitat ') : null);
  const to = destination ? ` to ${destination}` : '';
  const material = {food:'feed', manure:'compost', wood:'wood', water:'water'}[actor.material] || 'supplies';
  const labels = {
    'preparing-gift-foal':'Preparing a foal gift at the horse habitat', 'preparing-gift-cow':'Preparing a cow gift at the cattle habitat',
    'preparing-gift-chicken':'Preparing three chicken gifts', 'preparing-gift-goat':'Preparing a goat gift', 'preparing-gift-wheatSeedKg':'Preparing 10 kg of wheat seed at the garden',
    'gift-preparation-complete':'Gift prepared for the next neighboring family',
    'collecting-neighbor-gifts':'Collecting gifts for a neighboring family', 'packing-neighbor-gifts':'Packing the family gift bundle',
    'traveling-to-neighbor':'Traveling to a neighboring farm (off-site)', 'giving-neighbor-gifts':'Giving the family its animals and wheat seed',
    'returning-from-neighbor':'Returning from a neighboring farm (off-site)', 'returned-from-neighbor':'Back from the family visit',
    'walking-home':'Heading back to the depot', 'walking-to-materials':'Going to collect wood',
    'walking-to-care-supplies':`Going to collect ${material}`, 'walking-to-clean':`Going to clean${destination ? ' '+destination : ' the habitat'}`,
    'walking-to-build':`Going to build${destination ? ' '+destination : ''}`, 'walking-to-horse':'Going to meet a horse',
    'carrying-materials':`Taking wood${to}`, 'carrying-food':`Taking feed${to}`, 'carrying-water':`Taking water${to}`,
    'carrying-manure':'Taking compost to the depot', 'collecting':'Collecting wood', 'collecting-food':'Collecting feed',
    'collecting-water':'Collecting water', 'unloading':`Unloading wood${destination ? ' at '+destination : ''}`,
    'building':`Building${destination ? ' '+destination : ''}`, 'cleaning':'Cleaning the habitat', 'composting':'Dropping off compost',
    'replenishing-food':'Refilling feed', 'replenishing-water':'Refilling water', 'resting':'Resting',
    'waiting-for-work-or-materials':'Waiting for work or supplies', 'planning-the-farm':'Planning the next farm task',
    'ride':'Riding together', 'horse-play':'Spending time with a horse',
    'rest':'Resting', 'drink':'Seeking water', 'forage':'Looking for food', 'supplemental-feeding':'Seeking feed', 'explore':'Exploring', 'settling-in':'Settling in'
  };
  return {text: labels[activity] || activity.replaceAll('-', ' ') || 'No recorded activity', transit:/^(walking-|carrying-)/.test(activity)};
}
