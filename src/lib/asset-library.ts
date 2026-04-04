export interface RegistryAsset {
  id: string;
  src: string;
  category: string;
  name?: string;
}

export interface RegistryCategory {
  labelKey: string;
  items: RegistryAsset[];
}

export const assetLibrary: Record<string, RegistryCategory> = {
  backgrounds: {
    labelKey: "lib_backgrounds",
    items: [
      { id: "bg-solid-1", src: "/mock-library/backgrounds/bg-solid-1.svg", category: "backgrounds", name: "Solid Gray" }
    ]
  },
  overlays: {
    labelKey: "lib_overlays",
    items: [
      { id: "overlay-1", src: "/mock-library/overlays/overlay-1.svg", category: "overlays", name: "Pink Haze" }
    ]
  },
  frames: {
    labelKey: "lib_frames",
    items: [
      { id: "frame-1", src: "/mock-library/frames/frame-1.svg", category: "frames", name: "Simple Border" }
    ]
  },
  shapes: {
    labelKey: "lib_shapes",
    items: [
      { id: "shape-1", src: "/mock-library/shapes/shape-1.svg", category: "shapes", name: "Blue Circle" }
    ]
  },
  typography: {
    labelKey: "lib_typography",
    items: [
      { id: "type-1", src: "/mock-library/typography/type-1.svg", category: "typography", name: "Love Script" }
    ]
  },
  cinematic: {
    labelKey: "lib_cinematic",
    items: [
      { id: "cine-1", src: "/mock-library/cinematic/cine-1.svg", category: "cinematic", name: "Dark Vignette" }
    ]
  }
};
