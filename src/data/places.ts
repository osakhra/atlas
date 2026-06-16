import type { Place } from '@/lib/types';

/**
 * Canonical dataset of places Andrew Castor has lived, vacationed, worked,
 * or plans to visit. This file is append-only: never rewrite, regenerate,
 * or invent entries. See CLAUDE.md.
 */
export const places: Place[] = [
  {
    id: 'asia',
    name: 'Asia',
    tier: 'continent',
    children: [
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
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    tier: 'continent',
    children: [
      {
        id: 'france',
        name: 'France',
        tier: 'country',
        children: [
          { id: 'montpellier', name: 'Montpellier', tier: 'city', category: 'vacationed', lat: 43.6108, lng: 3.8767 },
          { id: 'paris', name: 'Paris', tier: 'city', category: 'vacationed', lat: 48.8566, lng: 2.3522 },
        ],
      },
      {
        id: 'germany',
        name: 'Germany',
        tier: 'country',
        children: [
          { id: 'frankfurt', name: 'Frankfurt', tier: 'city', category: 'vacationed', lat: 50.1109, lng: 8.6821 },
          { id: 'garmisch-partenkirchen', name: 'Garmisch-Partenkirchen', tier: 'city', category: 'vacationed', lat: 47.4924, lng: 11.0961 },
          { id: 'gunzburg', name: 'Günzburg', tier: 'city', category: 'vacationed', lat: 48.4519, lng: 10.2779 },
          { id: 'hamburg', name: 'Hamburg', tier: 'city', category: 'vacationed', lat: 53.5511, lng: 9.9937 },
          { id: 'lennestadt', name: 'Lennestadt', tier: 'city', category: 'vacationed', lat: 51.1167, lng: 8.0667 },
          { id: 'oberstaufenbach', name: 'Oberstaufenbach', tier: 'city', category: 'lived', lat: 49.555, lng: 7.553 },
        ],
      },
      {
        id: 'italy',
        name: 'Italy',
        tier: 'country',
        children: [
          { id: 'florence', name: 'Florence', tier: 'city', category: 'vacationed', lat: 43.7696, lng: 11.2558 },
          { id: 'pisa', name: 'Pisa', tier: 'city', category: 'vacationed', lat: 43.7228, lng: 10.4017 },
          { id: 'rome', name: 'Rome', tier: 'city', category: 'vacationed', lat: 41.9028, lng: 12.4964 },
          { id: 'siena', name: 'Siena', tier: 'city', category: 'vacationed', lat: 43.3186, lng: 11.3307 },
          { id: 'venice', name: 'Venice', tier: 'city', category: 'vacationed', lat: 45.4408, lng: 12.3155 },
        ],
      },
      {
        id: 'spain',
        name: 'Spain',
        tier: 'country',
        children: [
          { id: 'barcelona', name: 'Barcelona', tier: 'city', category: 'vacationed', lat: 41.3851, lng: 2.1734 },
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
        id: 'united-kingdom',
        name: 'United Kingdom',
        tier: 'country',
        children: [
          { id: 'london', name: 'London', tier: 'city', category: 'vacationed', lat: 51.5074, lng: -0.1278 },
        ],
      },
    ],
  },
  {
    id: 'north-america',
    name: 'North America',
    tier: 'continent',
    children: [
      {
        id: 'bahamas',
        name: 'Bahamas',
        tier: 'country',
        children: [
          { id: 'nassau', name: 'Nassau', tier: 'city', category: 'vacationed', lat: 25.0480, lng: -77.3554 },
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
        id: 'united-states',
        name: 'United States',
        tier: 'country',
        children: [
          {
            id: 'california',
            name: 'California',
            tier: 'state',
            children: [
              { id: 'crescent-city', name: 'Crescent City', tier: 'city', category: 'vacationed', lat: 41.7558, lng: -124.2026 },
              { id: 'lake-tahoe', name: 'Lake Tahoe', tier: 'city', category: 'vacationed', lat: 39.0968, lng: -120.0324 },
              { id: 'monterey', name: 'Monterey', tier: 'city', category: 'vacationed', lat: 36.6002, lng: -121.8947 },
              { id: 'novato', name: 'Novato', tier: 'city', category: 'vacationed', lat: 38.1074, lng: -122.5697 },
              { id: 'sacramento', name: 'Sacramento', tier: 'city', category: 'vacationed', lat: 38.5816, lng: -121.4944 },
              { id: 'san-francisco', name: 'San Francisco', tier: 'city', category: 'vacationed', lat: 37.7749, lng: -122.4194 },
            ],
          },
          {
            id: 'colorado',
            name: 'Colorado',
            tier: 'state',
            children: [
              { id: 'aspen', name: 'Aspen', tier: 'city', category: 'vacationed', lat: 39.1911, lng: -106.8175 },
              { id: 'colorado-springs', name: 'Colorado Springs', tier: 'city', category: 'vacationed', lat: 38.8339, lng: -104.8214 },
              { id: 'denver', name: 'Denver', tier: 'city', category: 'vacationed', lat: 39.7392, lng: -104.9903 },
              { id: 'ridgway', name: 'Ridgway', tier: 'city', category: 'vacationed', lat: 38.1528, lng: -107.7567 },
            ],
          },
          {
            id: 'florida',
            name: 'Florida',
            tier: 'state',
            children: [
              { id: 'fort-walton-beach', name: 'Fort Walton Beach', tier: 'city', category: 'lived', lat: 30.4058, lng: -86.6188 },
              { id: 'key-west', name: 'Key West', tier: 'city', category: 'vacationed', lat: 24.5551, lng: -81.7800 },
              { id: 'orlando', name: 'Orlando', tier: 'city', category: 'lived', lat: 28.5383, lng: -81.3792 },
              { id: 'palm-bay', name: 'Palm Bay', tier: 'city', category: 'vacationed', lat: 28.0345, lng: -80.5887 },
              { id: 'pensacola', name: 'Pensacola', tier: 'city', category: 'vacationed', lat: 30.4213, lng: -87.2169 },
              { id: 'sarasota', name: 'Sarasota', tier: 'city', category: 'vacationed', lat: 27.3364, lng: -82.5307 },
              { id: 'sebastian', name: 'Sebastian', tier: 'city', category: 'lived', lat: 27.8164, lng: -80.4706 },
              { id: 'st-petersburg', name: 'St. Petersburg', tier: 'city', category: 'vacationed', lat: 27.7676, lng: -82.6403 },
              { id: 'tallahassee', name: 'Tallahassee', tier: 'city', category: 'vacationed', lat: 30.4518, lng: -84.2807 },
              { id: 'tampa', name: 'Tampa', tier: 'city', category: 'lived', lat: 27.9506, lng: -82.4572 },
              { id: 'west-palm-beach', name: 'West Palm Beach', tier: 'city', category: 'vacationed', lat: 26.7153, lng: -80.0534 },
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
            id: 'idaho',
            name: 'Idaho',
            tier: 'state',
            children: [
              { id: 'city-of-rocks', name: 'City of Rocks', tier: 'poi', category: 'vacationed', lat: 41.6419, lng: -113.7025 },
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
            id: 'montana',
            name: 'Montana',
            tier: 'state',
            children: [
              { id: 'glacier-national-park', name: 'Glacier National Park', tier: 'poi', category: 'vacationed', lat: 48.7596, lng: -113.7870 },
              { id: 'libby', name: 'Libby', tier: 'city', category: 'vacationed', lat: 48.3886, lng: -115.5560 },
            ],
          },
          {
            id: 'ohio',
            name: 'Ohio',
            tier: 'state',
            children: [
              { id: 'dayton', name: 'Dayton', tier: 'city', category: 'vacationed', lat: 39.7589, lng: -84.1916 },
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
            id: 'south-dakota',
            name: 'South Dakota',
            tier: 'state',
            children: [
              { id: 'box-elder', name: 'Box Elder', tier: 'city', category: 'vacationed', lat: 44.1122, lng: -103.0682 },
              { id: 'keystone', name: 'Keystone', tier: 'city', category: 'vacationed', lat: 43.8955, lng: -103.4252 },
            ],
          },
          {
            id: 'texas',
            name: 'Texas',
            tier: 'state',
            children: [
              { id: 'amarillo', name: 'Amarillo', tier: 'city', category: 'vacationed', lat: 35.2220, lng: -101.8313 },
              { id: 'austin', name: 'Austin', tier: 'city', category: 'vacationed', lat: 30.2672, lng: -97.7431 },
              { id: 'dallas', name: 'Dallas', tier: 'city', category: 'vacationed', lat: 32.7767, lng: -96.7970 },
              { id: 'fort-davis', name: 'Fort Davis', tier: 'city', category: 'vacationed', lat: 30.5988, lng: -103.8938 },
              { id: 'laredo', name: 'Laredo', tier: 'city', category: 'work', lat: 27.5306, lng: -99.4803 },
              { id: 'lubbock', name: 'Lubbock', tier: 'city', category: 'vacationed', lat: 33.5779, lng: -101.8552 },
              { id: 'san-antonio', name: 'San Antonio', tier: 'city', category: 'vacationed', lat: 29.4241, lng: -98.4936 },
              { id: 'san-juan-tx', name: 'San Juan', tier: 'city', category: 'vacationed', lat: 26.1889, lng: -98.1561 },
              { id: 'sugar-land', name: 'Sugar Land', tier: 'city', category: 'lived', lat: 29.6197, lng: -95.6349 },
            ],
          },
          {
            id: 'virginia',
            name: 'Virginia',
            tier: 'state',
            children: [
              { id: 'vienna', name: 'Vienna', tier: 'city', category: 'lived', lat: 38.9012, lng: -77.2653 },
              { id: 'williamsburg', name: 'Williamsburg', tier: 'city', category: 'vacationed', lat: 37.2707, lng: -76.7075 },
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
            id: 'wyoming',
            name: 'Wyoming',
            tier: 'state',
            children: [
              { id: 'yellowstone', name: 'Yellowstone National Park', tier: 'poi', category: 'vacationed', lat: 44.4280, lng: -110.5885 },
            ],
          },
        ],
      },
    ],
  },
];
