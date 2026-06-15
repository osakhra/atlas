import type { Place } from '@/lib/types';

/**
 * Canonical dataset of places Andrew Castor has lived, vacationed, worked,
 * or plans to visit. This file is append-only: never rewrite, regenerate,
 * or invent entries. See CLAUDE.md.
 */
export const places: Place[] = [
  {
    id: 'north-america',
    name: 'North America',
    tier: 'continent',
    children: [
      {
        id: 'united-states',
        name: 'United States',
        tier: 'country',
        children: [
          {
            id: 'florida',
            name: 'Florida',
            tier: 'state',
            children: [
              { id: 'tampa', name: 'Tampa', tier: 'city', category: 'lived', lat: 27.9506, lng: -82.4572 },
              { id: 'orlando', name: 'Orlando', tier: 'city', category: 'lived', lat: 28.5383, lng: -81.3792 },
              { id: 'sebastian', name: 'Sebastian', tier: 'city', category: 'lived', lat: 27.8164, lng: -80.4706 },
              { id: 'key-west', name: 'Key West', tier: 'city', category: 'vacationed', lat: 24.5551, lng: -81.7800 },
            ],
          },
          {
            id: 'virginia',
            name: 'Virginia',
            tier: 'state',
            children: [
              { id: 'vienna', name: 'Vienna', tier: 'city', category: 'lived', lat: 38.9012, lng: -77.2653 },
            ],
          },
          {
            id: 'texas',
            name: 'Texas',
            tier: 'state',
            children: [
              { id: 'sugar-land', name: 'Sugar Land', tier: 'city', category: 'lived', lat: 29.6197, lng: -95.6349 },
              { id: 'lubbock', name: 'Lubbock', tier: 'city', category: 'vacationed', lat: 33.5779, lng: -101.8552 },
              { id: 'laredo', name: 'Laredo', tier: 'city', category: 'work', lat: 27.5306, lng: -99.4803 },
              { id: 'austin', name: 'Austin', tier: 'city', category: 'vacationed', lat: 30.2672, lng: -97.7431 },
              { id: 'dallas', name: 'Dallas', tier: 'city', category: 'vacationed', lat: 32.7767, lng: -96.7970 },
              { id: 'amarillo', name: 'Amarillo', tier: 'city', category: 'vacationed', lat: 35.2220, lng: -101.8313 },
            ],
          },
          {
            id: 'washington-dc',
            name: 'Washington, D.C.',
            tier: 'city',
            category: 'vacationed',
            lat: 38.9072,
            lng: -77.0369,
          },
          {
            id: 'hawaii',
            name: 'Hawaii',
            tier: 'state',
            children: [
              {
                id: 'oahu',
                name: "O'ahu",
                tier: 'island',
                children: [
                  { id: 'honolulu', name: 'Honolulu', tier: 'city', category: 'vacationed', lat: 21.3069, lng: -157.8583 },
                ],
              },
            ],
          },
          {
            id: 'colorado',
            name: 'Colorado',
            tier: 'state',
            children: [
              { id: 'aspen', name: 'Aspen', tier: 'city', category: 'vacationed', lat: 39.1911, lng: -106.8175 },
              { id: 'colorado-springs', name: 'Colorado Springs', tier: 'city', category: 'vacationed', lat: 38.8339, lng: -104.8214 },
            ],
          },
          {
            id: 'idaho',
            name: 'Idaho',
            tier: 'state',
            children: [
              { id: 'almo', name: 'Almo', tier: 'city', category: 'vacationed', lat: 42.0938, lng: -113.6361 },
            ],
          },
          {
            id: 'california',
            name: 'California',
            tier: 'state',
            children: [
              { id: 'san-francisco', name: 'San Francisco', tier: 'city', category: 'vacationed', lat: 37.7749, lng: -122.4194 },
              { id: 'crescent-city', name: 'Crescent City', tier: 'city', category: 'vacationed', lat: 41.7558, lng: -124.2026 },
              { id: 'lake-tahoe', name: 'Lake Tahoe', tier: 'city', category: 'vacationed', lat: 39.0968, lng: -120.0324 },
              { id: 'novato', name: 'Novato', tier: 'city', category: 'vacationed', lat: 38.1074, lng: -122.5697 },
            ],
          },
          {
            id: 'south-dakota',
            name: 'South Dakota',
            tier: 'state',
            children: [
              { id: 'box-elder', name: 'Box Elder', tier: 'city', category: 'vacationed', lat: 44.1122, lng: -103.0682 },
              { id: 'keystone', name: 'Keystone', tier: 'city', category: 'vacationed', lat: 43.8955, lng: -103.4252 },
            ],
          },
          {
            id: 'montana',
            name: 'Montana',
            tier: 'state',
            children: [
              { id: 'libby', name: 'Libby', tier: 'city', category: 'vacationed', lat: 48.3886, lng: -115.5560 },
            ],
          },
          {
            id: 'louisiana',
            name: 'Louisiana',
            tier: 'state',
            children: [
              { id: 'new-orleans', name: 'New Orleans', tier: 'city', category: 'vacationed', lat: 29.9511, lng: -90.0715 },
            ],
          },
          {
            id: 'oregon',
            name: 'Oregon',
            tier: 'state',
            children: [
              { id: 'ashland', name: 'Ashland', tier: 'city', category: 'vacationed', lat: 42.1946, lng: -122.7095 },
            ],
          },
          {
            id: 'south-carolina',
            name: 'South Carolina',
            tier: 'state',
            children: [
              { id: 'charleston', name: 'Charleston', tier: 'city', category: 'work', lat: 32.7765, lng: -79.9311 },
            ],
          },
          {
            id: 'georgia',
            name: 'Georgia',
            tier: 'state',
            children: [
              { id: 'atlanta', name: 'Atlanta', tier: 'city', category: 'vacationed', lat: 33.7490, lng: -84.3880 },
              { id: 'tiger', name: 'Tiger', tier: 'city', category: 'vacationed', lat: 34.8843, lng: -83.4774 },
            ],
          },
        ],
      },
      {
        id: 'costa-rica',
        name: 'Costa Rica',
        tier: 'country',
        children: [
          { id: 'grano-de-oro', name: 'Grano de Oro', tier: 'city', category: 'work', lat: 9.8438, lng: -83.6912 },
        ],
      },
      {
        id: 'bahamas',
        name: 'Bahamas',
        tier: 'country',
        children: [
          { id: 'nassau', name: 'Nassau', tier: 'city', category: 'vacationed', lat: 25.0480, lng: -77.3554 },
        ],
      },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    tier: 'continent',
    children: [
      {
        id: 'germany',
        name: 'Germany',
        tier: 'country',
        children: [
          { id: 'oberstaufenbach', name: 'Oberstaufenbach', tier: 'city', category: 'lived', lat: 49.555, lng: 7.553 },
          { id: 'hamburg', name: 'Hamburg', tier: 'city', category: 'vacationed', lat: 53.5511, lng: 9.9937 },
          { id: 'lennestadt', name: 'Lennestadt', tier: 'city', category: 'vacationed', lat: 51.1167, lng: 8.0667 },
          { id: 'garmisch-partenkirchen', name: 'Garmisch-Partenkirchen', tier: 'city', category: 'vacationed', lat: 47.4924, lng: 11.0961 },
        ],
      },
      {
        id: 'united-kingdom',
        name: 'United Kingdom',
        tier: 'country',
        children: [
          { id: 'london', name: 'London', tier: 'city', category: 'vacationed', lat: 51.5074, lng: -0.1278 },
        ],
      },
      {
        id: 'spain',
        name: 'Spain',
        tier: 'country',
        children: [
          {
            id: 'mallorca',
            name: 'Mallorca',
            tier: 'island',
            children: [
              { id: 'palma', name: 'Palma', tier: 'city', category: 'vacationed', lat: 39.5696, lng: 2.6502 },
            ],
          },
        ],
      },
      {
        id: 'france',
        name: 'France',
        tier: 'country',
        children: [
          { id: 'paris', name: 'Paris', tier: 'city', category: 'vacationed', lat: 48.8566, lng: 2.3522 },
        ],
      },
    ],
  },
  {
    id: 'asia',
    name: 'Asia',
    tier: 'continent',
    children: [
      {
        id: 'united-arab-emirates',
        name: 'United Arab Emirates',
        tier: 'country',
        children: [
          { id: 'abu-dhabi', name: 'Abu Dhabi', tier: 'city', category: 'lived', lat: 24.4539, lng: 54.3773 },
          { id: 'dubai', name: 'Dubai', tier: 'city', category: 'vacationed', lat: 25.2048, lng: 55.2708 },
          { id: 'qasr-al-sarab', name: 'Qasr Al Sarab', tier: 'poi', category: 'vacationed', lat: 22.8991, lng: 54.3361 },
        ],
      },
      {
        id: 'jordan',
        name: 'Jordan',
        tier: 'country',
        children: [
          { id: 'amman', name: 'Amman', tier: 'city', category: 'vacationed', lat: 31.9454, lng: 35.9284 },
        ],
      },
      {
        id: 'thailand',
        name: 'Thailand',
        tier: 'country',
        children: [
          { id: 'phuket', name: 'Phuket', tier: 'city', category: 'vacationed', lat: 7.8804, lng: 98.3923 },
        ],
      },
    ],
  },
];
