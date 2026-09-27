/* =========================================================
   THEMES — paleta de cores e ambientação de cada mundo.
   ========================================================= */
const THEMES = {
  forest: {
    sky: ['#5dbdf5', '#c4ecff'],
    background: 'hills',
    far: '#a5d8c0', mid: '#72c08f', near: '#4d9d66',
    ground: '#8b5a2b', groundDark: '#5f3b1a', top: '#47bf57', topLight: '#8ce26a',
    block: '#bb8449', blockDark: '#7a5028', blockLight: '#dcaa6c',
    plat: '#9c6b3a', platTop: '#cf9a5c',
    breakColor: '#d19c62',
    decor: ['tree', 'tree', 'bush', 'flower', 'grass', 'grass'],
    decorDensity: 0.38,
    ambient: 'leaves',
    sun: '#fff4b0'
  },
  desert: {
    sky: ['#ff9f5a', '#ffe6ad'],
    background: 'dunes',
    far: '#f6c894', mid: '#e8a96a', near: '#cf8b4d',
    ground: '#dca35a', groundDark: '#a8702f', top: '#f5d188', topLight: '#fff0bf',
    block: '#c98b4a', blockDark: '#8c5a2a', blockLight: '#e8b579',
    plat: '#a8743e', platTop: '#dcae70',
    breakColor: '#e7b775',
    decor: ['cactus', 'cactus', 'rock', 'dryGrass', 'dryGrass'],
    decorDensity: 0.28,
    ambient: 'dust',
    sun: '#fff1c9'
  },
  ice: {
    sky: ['#7ea6f2', '#e7f3ff'],
    background: 'peaks',
    far: '#c9dbf5', mid: '#9fb9e6', near: '#7c97cf',
    ground: '#7a8cb4', groundDark: '#55658c', top: '#f2f9ff', topLight: '#ffffff',
    block: '#9cb2d8', blockDark: '#6a80a8', blockLight: '#c8d9f2',
    plat: '#8aa0c8', platTop: '#e6f2ff',
    ice: '#a9e4ff', iceDark: '#6fbde6',
    breakColor: '#c9dcf3',
    decor: ['pine', 'pine', 'crystal', 'snowRock'],
    decorDensity: 0.3,
    ambient: 'snow',
    sun: '#ffffff'
  },
  volcano: {
    sky: ['#240c1c', '#8f2e18'],
    background: 'volcano',
    far: '#4a1e24', mid: '#34151a', near: '#230e12',
    ground: '#4d3431', groundDark: '#2c1d1c', top: '#734339', topLight: '#a4573f',
    block: '#5f3c35', blockDark: '#35201d', blockLight: '#86574b',
    plat: '#5a3a33', platTop: '#b0664a',
    breakColor: '#9b6a5b',
    lava: '#ff5a1f', lavaLight: '#ffc23d', lavaDark: '#c22a12',
    decor: ['rock', 'rock', 'redCrystal', 'smoke'],
    decorDensity: 0.25,
    ambient: 'embers',
    sun: null
  },
  castle: {
    sky: ['#15122b', '#43305f'],
    background: 'castle',
    far: '#2e2748', mid: '#241e3b', near: '#1a152c',
    ground: '#57536e', groundDark: '#34304a', top: '#7a7499', topLight: '#9d96c2',
    block: '#67618a', blockDark: '#3c3857', blockLight: '#8e88b3',
    plat: '#4d4868', platTop: '#8f86b8',
    breakColor: '#9a93bd',
    lava: '#ff5a1f', lavaLight: '#ffc23d', lavaDark: '#c22a12',
    decor: ['torch', 'banner', 'torch', 'chain'],
    decorDensity: 0.16,
    ambient: 'motes',
    sun: '#e9e4ff'
  }
};
