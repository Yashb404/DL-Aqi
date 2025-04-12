// src/utils/colors.js

import { AQI_CATEGORIES } from '../config/constants';

/**
 * Get the appropriate color for an AQI value
 * @param {number} aqi - The Air Quality Index value
 * @returns {string} - A hex color code
 */
export function getAqiColor(aqi) {
  if (aqi <= AQI_CATEGORIES.GOOD.max) {
    return AQI_CATEGORIES.GOOD.color;
  } else if (aqi <= AQI_CATEGORIES.MODERATE.max) {
    return AQI_CATEGORIES.MODERATE.color;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY_SENSITIVE.max) {
    return AQI_CATEGORIES.UNHEALTHY_SENSITIVE.color;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY.max) {
    return AQI_CATEGORIES.UNHEALTHY.color;
  } else if (aqi <= AQI_CATEGORIES.VERY_UNHEALTHY.max) {
    return AQI_CATEGORIES.VERY_UNHEALTHY.color;
  } else {
    return AQI_CATEGORIES.HAZARDOUS.color;
  }
}

/**
 * Get the category label for an AQI value
 * @param {number} aqi - The Air Quality Index value
 * @returns {string} - A descriptive category label
 */
export function getAqiCategory(aqi) {
  if (aqi <= AQI_CATEGORIES.GOOD.max) {
    return AQI_CATEGORIES.GOOD.label;
  } else if (aqi <= AQI_CATEGORIES.MODERATE.max) {
    return AQI_CATEGORIES.MODERATE.label;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY_SENSITIVE.max) {
    return AQI_CATEGORIES.UNHEALTHY_SENSITIVE.label;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY.max) {
    return AQI_CATEGORIES.UNHEALTHY.label;
  } else if (aqi <= AQI_CATEGORIES.VERY_UNHEALTHY.max) {
    return AQI_CATEGORIES.VERY_UNHEALTHY.label;
  } else {
    return AQI_CATEGORIES.HAZARDOUS.label;
  }
}

/**
 * Get the description for an AQI value
 * @param {number} aqi - The Air Quality Index value
 * @returns {string} - A descriptive text about the AQI level
 */
export function getAqiDescription(aqi) {
  if (aqi <= AQI_CATEGORIES.GOOD.max) {
    return AQI_CATEGORIES.GOOD.desc;
  } else if (aqi <= AQI_CATEGORIES.MODERATE.max) {
    return AQI_CATEGORIES.MODERATE.desc;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY_SENSITIVE.max) {
    return AQI_CATEGORIES.UNHEALTHY_SENSITIVE.desc;
  } else if (aqi <= AQI_CATEGORIES.UNHEALTHY.max) {
    return AQI_CATEGORIES.UNHEALTHY.desc;
  } else if (aqi <= AQI_CATEGORIES.VERY_UNHEALTHY.max) {
    return AQI_CATEGORIES.VERY_UNHEALTHY.desc;
  } else {
    return AQI_CATEGORIES.HAZARDOUS.desc;
  }
}