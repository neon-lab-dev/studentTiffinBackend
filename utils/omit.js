/**
 * Returns a new object with the specified keys omitted.
 **/
const omit = (obj, keys) => {
  const newObj = { ...obj };
  keys.forEach((key) => delete newObj[key]);
  return newObj;
};
export default omit;