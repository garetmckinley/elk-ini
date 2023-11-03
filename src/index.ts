import { Ini } from "./ini";

export * from "./ini";
export * from "./types";

export default Ini;

const sampleIni = `
[hub]
HUE_BRIDGE_USER=USER
HUE_BRIDGE_KEY=KEY
HUE_BRIDGE_IP=192.168.1.8

; this is a test comment
[use.remote]
nocache=<true
urls[]=https://pastebin.com/raw/Na2Hmfm8
urls[]=https://hue.elk.wtf/palettes/cyberpunk

[use.local]
paths[]=./palettes.ini
paths[]=colors.ini
`;

const ini = new Ini(sampleIni);
console.log(ini.value);
console.log(ini.render());
// console.log(ini.stringify());
// ini.set("hub", "HUE_BRIDGE_USER", "test");

console.log(sampleIni === ini.stringify());

// [this.thing]
// value[]=<./palettes.ini
