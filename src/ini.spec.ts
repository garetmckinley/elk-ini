import { Ini } from "./ini";

jest.mock("uuid", () => ({
  v4: () => "00000000-0000-0000-0000-000000000000",
}));

const sampleIni = `[hub]
HUE_BRIDGE_USER=USER
HUE_BRIDGE_KEY=KEY
HUE_BRIDGE_IP=192.168.1.8

; this is a test comment
[use.remote]
nocache=<true
urls[]=https://pastebin.com/raw/Na2Hmfm8

[use.local]
paths[]=./palettes.ini
paths[]=colors.ini
`;

describe("Ini", () => {
  it("should parse an ini file", () => {
    const ini = new Ini(sampleIni);
    expect(ini.value).toMatchSnapshot();
  });

  //   it("should stringify an ini file", () => {
  //     const ini = new Ini(sampleIni);
  //     console.log(ini.data);
  //     expect(ini.stringify()).toEqual(`[hub]
  // HUE_BRIDGE_USER=USER
  // HUE_BRIDGE_KEY=KEY
  // HUE_BRIDGE_IP=192.168.1.8

  // ; this is a test comment
  // [use.remote]
  // nocache=<true
  // urls[]=https://pastebin.com/raw/Na2Hmfm8
  // urls[]=https://hue.elk.wtf/palettes/cyberpunk

  // [use.local]
  // paths[]=./palettes.ini
  // paths[]=colors.ini
  // `);
  //   });

  it("should render an ini file as a static object", () => {
    const ini = new Ini(sampleIni);

    expect(ini.render()).toMatchObject({
      hub: {
        HUE_BRIDGE_USER: "USER",
        HUE_BRIDGE_KEY: "KEY",
        HUE_BRIDGE_IP: "192.168.1.8",
      },
      use: {
        local: {
          paths: ["./palettes.ini", "colors.ini"],
        },
        remote: {
          nocache: true,
          urls: ["https://pastebin.com/raw/Na2Hmfm8"],
        },
      },
    });
  });

  it("can find shallow keys", () => {
    const ini = new Ini(sampleIni);

    const matches = ini.query("hub");
    const hub = matches[0].render() as any;

    expect(matches.length).toEqual(1);
    expect(hub).toMatchObject({
      HUE_BRIDGE_USER: "USER",
      HUE_BRIDGE_KEY: "KEY",
      HUE_BRIDGE_IP: "192.168.1.8",
    });
  });

  it("can find deeply nested keys", () => {
    const ini = new Ini(sampleIni);

    const matches = ini.query("use.remote.nocache");

    expect(matches.length).toEqual(1);
    expect(matches[0].value).toEqual(true);
  });

  it("can find array keys", () => {
    const ini = new Ini(sampleIni);

    const matches = ini.get("use.remote.urls");

    expect(matches?.render()).toEqual(["https://pastebin.com/raw/Na2Hmfm8"]);
  });

  it("can set shallow keys", () => {
    const ini = new Ini(sampleIni);

    ini.set("hub", {
      HUE_BRIDGE_USER: "TEST_USER",
      HUE_BRIDGE_KEY: "TEST_KEY",
      HUE_BRIDGE_IP: "TEST_IP",
    });

    expect(ini.query("hub")[0].render()).toStrictEqual({
      HUE_BRIDGE_USER: "TEST_USER",
      HUE_BRIDGE_KEY: "TEST_KEY",
      HUE_BRIDGE_IP: "TEST_IP",
    });
  });

  it("can set deeply nested keys", () => {
    const ini = new Ini(sampleIni);

    const hub = ini.query("hub");

    expect(hub.length).toEqual(1);

    hub[0]!.set("HUE_BRIDGE_USER", "NEW_USER");

    expect(ini.value).toMatchSnapshot();
  });

  it("can delete shallow keys", () => {
    const ini = new Ini(sampleIni);

    let hub = ini.get("hub");

    hub!.drop();

    hub = ini.query("hub")[0];

    expect(hub).toBeUndefined();
  });

  it("can delete deeply nested keys", () => {
    const ini = new Ini(sampleIni);

    let nocache = ini.get("use.remote.nocache");

    expect(nocache).toBeDefined();

    nocache?.drop();

    nocache = ini.query("use.remote.nocache")[0];

    expect(nocache).toBeUndefined();
  });

  it("can merge ini files", () => {
    const ini = new Ini(sampleIni);

    ini.merge(
      new Ini(`[hub]
additional=TEST

[newkey]
newvalue=TEST`)
    );

    expect(ini.render()).toMatchObject({
      hub: {
        HUE_BRIDGE_USER: "USER",
        HUE_BRIDGE_KEY: "KEY",
        HUE_BRIDGE_IP: "192.168.1.8",
        additional: "TEST",
      },
      use: {
        local: {
          paths: ["./palettes.ini", "colors.ini"],
        },
        remote: {
          nocache: true,
          urls: ["https://pastebin.com/raw/Na2Hmfm8"],
        },
      },
      newkey: {
        newvalue: "TEST",
      },
    });
  });
});
