let latestSignal = null;

function setSignal(signal) {
    console.log("STORE -> setSignal()");
    latestSignal = signal;
}

function getSignal() {
    console.log("STORE -> getSignal()", latestSignal);
    return latestSignal;
}

module.exports = {
    setSignal,
    getSignal,
};