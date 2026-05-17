export type CctvCountry = {
  code: string;
  name: string;
};

export type CctvLocation = {
  city: string;
  region: string;
  regionCode: string;
  country: string;
  countryCode: string;
  continent: string;
  continentCode: string;
  latitude: number;
  longitude: number;
};

export type CctvImageSet = {
  icon: string;
  thumbnail: string;
  preview: string;
};

export type CctvImages = {
  current: CctvImageSet;
  daylight: CctvImageSet;
};

export type CctvPlayer = {
  day: string;
  month: string;
  year: string;
  lifetime: string;
};

export type CctvCamera = {
  webcamId: number;
  title: string;
  viewCount: number;
  status: string;
  lastUpdatedOn?: string | null;
  location: CctvLocation;
  images: CctvImages;
  player: CctvPlayer;
};

export type CctvWebcamSearchResponse = {
  total: number;
  webcams: CctvCamera[];
};
