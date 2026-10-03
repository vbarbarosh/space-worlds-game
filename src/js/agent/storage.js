'use strict';
// Runs before the game: the agent's page keeps its own storage, so its save never mixes with the player's.
const agent_storage_get = Storage.prototype.getItem;
const agent_storage_set = Storage.prototype.setItem;
const agent_storage_remove = Storage.prototype.removeItem;

Storage.prototype.getItem = function (key) {
    return agent_storage_get.call(this, `agent:${key}`);
};
Storage.prototype.setItem = function (key, value) {
    return agent_storage_set.call(this, `agent:${key}`, value);
};
Storage.prototype.removeItem = function (key) {
    return agent_storage_remove.call(this, `agent:${key}`);
};
