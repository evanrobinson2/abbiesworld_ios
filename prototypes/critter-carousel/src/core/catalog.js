// Mirrors CreatureBuilderContent in
// abbies.world.ios/abbies.world.ios/Models/CreatureCardModels.swift.
// The ids match the Swift side on purpose: whatever this prototype settles on
// can be handed to the existing generation pipeline as a CreatureRecipe
// without a translation layer.

export const STAGES = ['creature', 'outfit', 'buddy'];

export const STAGE_PROMPTS = {
  creature: 'Who do you want to be?',
  outfit: 'What are you wearing?',
  buddy: 'Who comes with you?',
};

export const CREATURES = [
  { id: 'abbie', name: 'Abbie', look: 'a cheerful young girl with bright curious eyes' },
  { id: 'dragon', name: 'Dragon', look: 'a powerful but friendly dragon with expressive eyes' },
  { id: 'robot', name: 'Robot', look: 'a cute robot with glowing eyes and friendly demeanor' },
  { id: 'bunny', name: 'Bunny', look: 'an adorable bunny with soft fur and big ears' },
  { id: 'cat', name: 'Cat', look: 'a playful cat with bright eyes and fluffy tail' },
  { id: 'dinosaur', name: 'Dinosaur', look: 'a friendly dinosaur with a big smile' },
  { id: 'alien', name: 'Alien', look: 'a cute alien with big eyes and antennae' },
  { id: 'monster', name: 'Monster', look: 'a silly friendly monster with a goofy grin' },
];

export const OUTFITS = [
  {
    id: 'lightning-racer',
    name: 'Lightning Racer',
    look: 'wearing a sleek racing uniform crackling with electricity',
    power: 'extreme speed and electrical energy',
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    look: 'wearing a space suit with helmet and cosmic gear',
    power: 'space exploration and zero gravity',
  },
  {
    id: 'ninja',
    name: 'Ninja',
    look: 'wearing stealthy ninja outfit with mask',
    power: 'stealth, agility, and shadow powers',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    look: 'wearing a magical robe with wizard hat and staff',
    power: 'magic spells and mystical powers',
  },
  {
    id: 'knight',
    name: 'Knight',
    look: 'wearing shining armor with sword and shield',
    power: 'bravery, protection, and honor',
  },
  {
    id: 'firefighter',
    name: 'Firefighter',
    look: 'wearing firefighter gear with helmet and coat',
    power: 'fire resistance and rescue abilities',
  },
  {
    id: 'superhero',
    name: 'Superhero',
    look: 'wearing a colorful superhero costume with cape',
    power: 'super strength and flying',
  },
  {
    id: 'pirate',
    name: 'Pirate',
    look: 'wearing pirate outfit with hat and eyepatch',
    power: 'treasure hunting and sea adventures',
  },
];

export const BUDDIES = [
  {
    id: 'bat',
    name: 'Bat',
    look: 'with a tiny bat companion',
    personality: ['spooky', 'mischievous', 'gothic', 'nocturnal'],
  },
  {
    id: 'cheetah',
    name: 'Cheetah',
    look: 'with a small cheetah cub companion',
    personality: ['fast', 'competitive', 'energetic', 'athletic', 'confident'],
  },
  {
    id: 'puppy',
    name: 'Puppy',
    look: 'with an adorable puppy companion',
    personality: ['happy', 'loyal', 'playful', 'friendly'],
  },
  {
    id: 'owl',
    name: 'Owl',
    look: 'with a wise owl companion',
    personality: ['clever', 'mysterious', 'calm', 'magical'],
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    look: 'with a magical unicorn companion',
    personality: ['magical', 'graceful', 'pure', 'dreamy'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    look: 'with a colorful peacock companion',
    personality: ['dramatic', 'proud', 'colorful', 'glamorous'],
  },
  {
    id: 'frog',
    name: 'Frog',
    look: 'with a cheerful frog companion',
    personality: ['bouncy', 'silly', 'nature-loving', 'adventurous'],
  },
  {
    id: 'fox',
    name: 'Fox',
    look: 'with a clever fox companion',
    personality: ['clever', 'cunning', 'curious', 'playful'],
  },
];

export const LANES = {
  creature: CREATURES,
  outfit: OUTFITS,
  buddy: BUDDIES,
};

export function laneFor(stage) {
  return LANES[stage] ?? [];
}

export function itemFor(stage, id) {
  return laneFor(stage).find((entry) => entry.id === id) ?? null;
}
