import { TableRow, Column } from '../types';

export const COLUMNS: Column[] = [
  { id: 'name', label: 'Name', type: 'text', width: '220px' },
  { id: 'age', label: 'Age', type: 'number', width: '90px', unit: 'years' },
  { id: 'exp', label: 'Exp', type: 'number', width: '90px', unit: 'years' },
  { id: 'tenure', label: 'Tenure', type: 'number', width: '100px', unit: 'years' },
  { id: 'score', label: 'Score', type: 'number', width: '110px', unit: 'percent' },
  { id: 'birthday', label: 'Birthday', type: 'date', width: '110px' },
  { id: 'manager', label: 'Manager', type: 'person', width: '160px' },
  { id: 'company', label: 'Company', type: 'company', width: '180px' },
];

const MANAGERS = [
  { name: 'Ignacio Rau', initials: 'IR' },
  { name: 'Eva Hill', initials: 'EH' },
  { name: 'Darlene Konop', initials: 'DK' },
  { name: 'Loretta Stark', initials: 'LS' },
  { name: 'Randolph Price', initials: 'RP' },
];

const COMPANIES = [
  { name: 'Terry - Co' },
  { name: 'Simonis LLC' },
  { name: 'Sanford Inc' },
  { name: 'Koch Group' },
  { name: 'Schmeler Co' },
];

export const generateMockRows = (count: number): TableRow[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: [
      'Armando Herman', 'Elisa Gusikowski', 'Cristina Olson', 'Belinda Bashir',
      'Rex Blanda', 'Janice Gerlach', 'Steven Kunde', 'Mario Cole',
      'Rhonda Barton', 'Homer Hand', 'Javier Kutch'
    ][i % 11],
    external: Math.random() > 0.5,
    age: 20 + Math.floor(Math.random() * 40),
    exp: Math.floor(Math.random() * 25),
    tenure: Math.floor(Math.random() * 10),
    score: 5 + Math.floor(Math.random() * 90),
    birthday: '01/01/1970',
    manager: MANAGERS[i % MANAGERS.length],
    company: COMPANIES[i % COMPANIES.length],
    country: ['Germany', 'Norway', 'Zimbabwe', 'Canada', 'Iran', 'Croatia'][i % 6],
    favSongs: 'Mock song data',
    favColor: '#4ADE80',
    files: ['pdf', 'doc'],
  }));
};