import { BehavioralAnalyzer, MouseEvent } from '../src/behavioral';

const analyzer = new BehavioralAnalyzer();

const events = [
  { x: 0, y: 100, t: 0 },
  { x: 0, y: 50, t: 100 },
  { x: 0, y: 0, t: 200 }, // upward
  { x: 0, y: 60, t: 350 }, // downward
  { x: 0, y: 120, t: 500 },
];

console.log('Features:', JSON.stringify(analyzer.extractFeatures(events), null, 2));
