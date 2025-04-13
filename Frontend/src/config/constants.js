// Delhi geographic constants
export const DELHI_CENTER = {
  longitude: 77.1025,  // Centered properly on Delhi
  latitude: 28.65,
};

export const DELHI_BOUNDS = {
  maxLongitude: 77.5,   // Eastern bound - expanded
  minLongitude: 76.8,   // Western bound - expanded
  maxLatitude: 29.0,    // Northern bound - expanded
  minLatitude: 28.3     // Southern bound - expanded
};

// AQI Category thresholds
export const AQI_CATEGORIES = {
  GOOD: {
    min: 0,
    max: 50,
    color: '#00E400',
    label: 'Good',
    desc: 'Air quality is satisfactory, and air pollution poses little or no risk.'
  },
  MODERATE: {
    min: 51,
    max: 100,
    color: '#FFFF00',
    label: 'Moderate',
    desc: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.'
  },
  UNHEALTHY_SENSITIVE: {
    min: 101,
    max: 150,
    color: '#FF7E00',
    label: 'Unhealthy for Sensitive Groups',
    desc: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.'
  },
  UNHEALTHY: {
    min: 151,
    max: 200,
    color: '#FF0000',
    label: 'Unhealthy',
    desc: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
  },
  VERY_UNHEALTHY: {
    min: 201,
    max: 300,
    color: '#99004C',
    label: 'Very Unhealthy',
    desc: 'Health alert: The risk of health effects is increased for everyone.'
  },
  HAZARDOUS: {
    min: 301,
    max: 500,
    color: '#7E0023',
    label: 'Hazardous',
    desc: 'Health warning of emergency conditions: everyone is more likely to be affected.'
  }
}; 