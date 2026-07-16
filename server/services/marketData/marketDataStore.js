const store = {};

function setData(key, value) {
    store[key] = {
        value,
        updatedAt: Date.now(),
    };
}

function getData(key) {
    return store[key] || null;
}

module.exports = {
    setData,
    getData,
};