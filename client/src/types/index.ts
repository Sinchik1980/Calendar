export interface Task {
  _id: string;
  title: string;
  date: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}
