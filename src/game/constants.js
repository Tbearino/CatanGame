// ============================================================
//  src/game/constants.js
//  All the game data: theme colors, terrain, players, costs,
//  dev cards. If you want to tweak game settings, do it here.
// ============================================================

// ---- THEME TOKENS (retune the whole look from here) ----
export const T = {
  table:      "#16120c",
  tableEdge:  "#0e0b07",
  sea:        "#173f47",
  seaDeep:    "#0e2a30",
  seaLine:    "#2f6b74",
  parchment:  "#ece0c6",
  parchDeep:  "#dccaa4",
  ink:        "#3a2a18",
  inkSoft:    "#6b5638",
  gold:       "#c2972f",
  goldSoft:   "#e2c878",
  wax:        "#9e3b2e",
};

// ---- HEX GEOMETRY ----
export const HEX_SIZE = 56;
export const DOT_COUNT = { 2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1 };
export const PROBABILITY = { 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:5, 9:4, 10:3, 11:2, 12:1 };

// ---- TERRAIN ----
export const TERRAIN_POOL = [
  "wood","wood","wood","wood",
  "sheep","sheep","sheep","sheep",
  "wheat","wheat","wheat","wheat",
  "brick","brick","brick",
  "ore","ore","ore",
  "desert",
];
export const NUMBER_POOL = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
export const ROW_COUNTS = [3,4,5,4,3];

export const TERRAIN_STYLES = {
  wood:   { fill:"#3f6b34", lit:"#5a8a48", shade:"#274d20", emoji:"🌲", label:"Forest" },
  brick:  { fill:"#a8462a", lit:"#c25f3c", shade:"#7d301c", emoji:"🧱", label:"Hills" },
  sheep:  { fill:"#86a84a", lit:"#a3c468", shade:"#647f33", emoji:"🐑", label:"Pasture" },
  wheat:  { fill:"#c99a2e", lit:"#e3bb52", shade:"#9c7418", emoji:"🌾", label:"Fields" },
  ore:    { fill:"#5f7682", lit:"#7e96a2", shade:"#445660", emoji:"⛏️", label:"Mountains" },
  desert: { fill:"#c2a76e", lit:"#d8c08d", shade:"#9c8350", emoji:"🏜️", label:"Desert" },
};

export const RES = {
  wood:  { color:"#4a7c3f", emoji:"🌲", label:"Wood" },
  brick: { color:"#c0522b", emoji:"🧱", label:"Brick" },
  sheep: { color:"#8fb84e", emoji:"🐑", label:"Sheep" },
  wheat: { color:"#d4a017", emoji:"🌾", label:"Wheat" },
  ore:   { color:"#7a8fa6", emoji:"⛏️", label:"Ore" },
};

export const TERRAIN_RESOURCE = {
  wood:"wood", brick:"brick", sheep:"sheep", wheat:"wheat", ore:"ore"
};

// ---- PLAYERS ----
export const PLAYERS = [
  { id:0, name:"Crimson", color:"#c0392b", colorLit:"#e05c4e", emoji:"🔴" },
  { id:1, name:"Cobalt",  color:"#3e6ea8", colorLit:"#5d8fce", emoji:"🔵" },
];
export const SETUP_ORDER = [0, 1, 1, 0];

// ---- BUILDING COSTS (official) ----
export const COSTS = {
  road:       { wood:1, brick:1 },
  settlement: { wood:1, brick:1, sheep:1, wheat:1 },
  city:       { wheat:2, ore:3 },
  dev:        { sheep:1, wheat:1, ore:1 },
};
export const LIMITS = { road:15, settlement:5, city:4 };

// ---- DEVELOPMENT CARDS ----
export const DEV_DECK = [
  ...Array(14).fill("knight"),
  ...Array(5).fill("vp"),
  ...Array(2).fill("roadBuilding"),
  ...Array(2).fill("yearOfPlenty"),
  ...Array(2).fill("monopoly"),
];
export const DEV_INFO = {
  knight:       { emoji:"⚔️", label:"Knight", desc:"Move the robber & steal" },
  vp:           { emoji:"🏆", label:"Victory Point", desc:"+1 VP (hidden)" },
  roadBuilding: { emoji:"🛤️", label:"Road Building", desc:"Place 2 free roads" },
  yearOfPlenty: { emoji:"🌟", label:"Year of Plenty", desc:"Take any 2 resources" },
  monopoly:     { emoji:"💰", label:"Monopoly", desc:"Take all of 1 resource" },
};
