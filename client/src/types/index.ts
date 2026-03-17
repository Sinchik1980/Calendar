export interface Task {
  _id: string;
  title: string;
  date: string;
  order: number;
  audioUrl?: string;
  time?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}
