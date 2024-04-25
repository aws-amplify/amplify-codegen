// polyfil for window.performance.now

const performanceNow = function() {
  return new Date().getTime();
};

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
/**
 * @param {number[]} previousTimestamp
 */
export default function hrtime(previousTimestamp) {
  const clocktime = performanceNow.call(performance) * 1e-3;
  let seconds = Math.floor(clocktime);
  let nanoseconds = Math.floor((clocktime % 1) * 1e9);

  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];

    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }

  return [seconds, nanoseconds];
}
