// The dev page writes its scenario into the URL: the flags of the 3D view go with it, so a reload keeps the view the
// switch shows (js/render3d/scene.js)
const render3d_base_dev_scenario_save = dev_scenario_save;

dev_scenario_save = function () {
    render3d_base_dev_scenario_save();
    const params = new URLSearchParams(location.search);
    if (render3d.wanted) {
        params.set('render', '3d');
        if (!render3d.shadows) {
            params.set('shadows', '0');
        }
    }
    else {
        params.delete('render');
    }
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
};

// A switch of the view rewrites the URL at once, so a reload does not bring back the one switched away from
const render3d_base_view_set = render3d_view_set;

render3d_view_set = function (view) {
    render3d_base_view_set(view);
    dev_scenario_save();
};
