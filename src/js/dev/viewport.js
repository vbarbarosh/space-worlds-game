'use strict';
// Runs before the game: the dev page keeps its own storage and gives the game only the window left of the dev panel.
const dev_layout = {collapsed: false};
const dev_storage_get = Storage.prototype.getItem;
const dev_storage_set = Storage.prototype.setItem;
const dev_storage_remove = Storage.prototype.removeItem;
const dev_inner_width = Object.getOwnPropertyDescriptor(window, 'innerWidth');

Storage.prototype.getItem = function (key) {
    return dev_storage_get.call(this, 'dev:' + key);
};
Storage.prototype.setItem = function (key, value) {
    return dev_storage_set.call(this, 'dev:' + key, value);
};
Storage.prototype.removeItem = function (key) {
    return dev_storage_remove.call(this, 'dev:' + key);
};
Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    get: function () {
        const width = dev_inner_width.get.call(window);
        const panel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dev-panel-width')) || 0;
        return dev_layout.collapsed ? width : Math.max(320, width - panel);
    },
});
