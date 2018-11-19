(function(FuseBox){FuseBox.$fuse$=FuseBox;
FuseBox.target = "browser";
FuseBox.pkg("default", {}, function(___scope___){
___scope___.file("meshspin.js", function(exports, require, module, __filename, __dirname){

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1() {
    this.scaleFactor = 50;
    this.fps = 60;
    this.viewBox = [-100, -100, 200, 200];
    this.fake3D = false;
    this.debug = false;
    this.edgeSeperator = ',';
    this.background = false;
    this.fillColor = null;
    // Default figure is a tetrahedron
    this.fig = {
        nodes: [
            { x: Math.sqrt(8 / 9), y: 0, z: -1 / 3 },
            { x: -Math.sqrt(2 / 9), y: Math.sqrt(2 / 3), z: -1 / 3 },
            { x: -Math.sqrt(2 / 9), y: -Math.sqrt(2 / 3), z: -1 / 3 },
            { x: 0, y: 0, z: 1 },
        ].map(n => ({ x: n.x * this.scaleFactor, y: n.y * this.scaleFactor, z: n.z * this.scaleFactor })),
        edges: [[3, 2], [0, 2], [1, 2], [3, 0], [3, 1], [1, 0]]
    };
    this.staticRotation = {
        x: 0.01,
        y: 0.01,
        z: 0.01,
    };
    // Create a deep copy of figure
    this.figure = function (figure) {
        this.fig = JSON.parse(JSON.stringify(figure));
        this.scale();
    };
    this.scale = function () {
        this.fig.nodes = this.fig.nodes.map(n => ({ x: n.x * this.scaleFactor, y: n.y * this.scaleFactor, z: n.z * this.scaleFactor }));
    };
    this.rotate = function (r) {
        this.fig.nodes = this.fig.nodes.map(n => ({
            // X-Axis
            x: n.x * Math.cos(r.x) - n.z * Math.sin(r.x),
            y: n.y,
            z: n.z * Math.cos(r.x) + n.x * Math.sin(r.x),
        })).map(n => ({
            // Y-Axis
            x: n.x,
            y: n.y * Math.cos(r.y) - n.z * Math.sin(r.y),
            z: n.z * Math.cos(r.y) + n.y * Math.sin(r.y),
        })).map(n => ({
            // Z-Axis
            x: n.x * Math.cos(r.z) - n.y * Math.sin(r.z),
            y: n.y * Math.cos(r.z) + n.x * Math.sin(r.z),
            z: n.z,
        }));
    };
    this.sortEdges = function (edges) {
        for (let i = 0; i < edges.length; ++i) {
            edges[i].sort();
        }
        var strEdges = edges
            .map(n => n.join(this.edgeSeperator))
            .filter((v, i, a) => a.indexOf(v) === i);
        strEdges.sort();
        return strEdges;
    };
    this.setup = function (parentId) {
        this.fig.edges = this.sortEdges(this.fig.edges);
        // Setup SVG
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute('viewBox', this.viewBox.join(' '));
        this.ns = this.svg.namespaceURI;
        var parentElement = document.getElementById(parentId);
        parentElement.appendChild(this.svg);
        document.addEventListener('mousemove', this.mouseUpdate(), false);
        document.addEventListener('mouseenter', this.mouseUpdate(), false);
    };
    this.nextOutlineNode = function (current, prev) {
        function vecSub(v1, v2) {
            return { x: v1.x - v2.x, y: v1.y - v2.y };
        }
        function alpha(v1, v2) {
            return Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y)));
        }
        if (prev === null) {
            prevNode = { x: this.fig.nodes[current].x - 1, y: this.fig.nodes[current].y };
        }
        else {
            prevNode = this.fig.nodes[prev];
        }
        prevVector = vecSub(this.fig.nodes[current], prevNode);
        var angles = this.fig.nodes
            .map(n => vecSub(n, this.fig.nodes[current]))
            .map(n => alpha(prevVector, n))
            .map((n, i) => i == current || i == prev || isNaN(n) ? 7 : n); // 7 > 2PI
        return angles.indexOf(Math.min.apply(Math, angles));
    };
    this.outlineEdges = function () {
        var nodes = [];
        var outline = [];
        // Get node with max value of x
        var x = this.fig.nodes.map(n => n.x);
        var start = x.indexOf(Math.max.apply(Math, x));
        var last = null;
        var current = start;
        do {
            next = this.nextOutlineNode(current, last);
            nodes.push(current);
            outline.push([current, next]);
            last = current;
            current = next;
        } while (current != start);
        outline = this.sortEdges(outline);
        if (this.background) {
            this.backgroundPoly = nodes.map(x => this.fig.nodes[x].x.toString() + ',' + this.fig.nodes[x].y.toString());
        }
        return [nodes, outline];
    };
    this.fake3Dedges = function () {
        var outline = this.outlineEdges();
        outlineNodes = outline[0];
        var edges = outline[1].concat(this.fig.edges
            .map(x => x.split(this.edgeSeperator).map(y => parseInt(y)))
            .filter(x => (this.fig.nodes[x[0]].z >= 0 && this.fig.nodes[x[1]].z >= 0) ||
            (this.fig.nodes[x[0]].z >= this.fig.nodes[x[1]].z && outlineNodes.indexOf(x[1]) >= 0 && outlineNodes.indexOf(x[0]) == -1) ||
            (this.fig.nodes[x[1]].z >= this.fig.nodes[x[0]].z && outlineNodes.indexOf(x[0]) >= 0 && outlineNodes.indexOf(x[1]) == -1))
            .map(x => x.join(this.edgeSeperator)))
            .filter((v, i, a) => a.indexOf(v) === i);
        edges.sort();
        return edges;
    };
    this.draw = function () {
        // Remove all elements
        while (this.svg.lastChild) {
            this.svg.removeChild(this.svg.lastChild);
        }
        var r = this.getRotationOffset();
        this.rotate(r);
        var edges = this.fake3D ? this.fake3Dedges() : this.fig.edges;
        if (this.background) {
            var poly = document.createElementNS(this.ns, 'polygon');
            poly.setAttribute('points', this.backgroundPoly.join(' '));
            poly.setAttribute('class', 'meshspin-background');
            if (this.fillColor) {
                poly.setAttribute('fill', this.fillColor);
            }
            this.svg.appendChild(poly);
        }
        for (let n = 0; n < edges.length; n++) {
            var edge = edges[n].split(this.edgeSeperator);
            var line = document.createElementNS(this.ns, 'line');
            line.setAttribute('x1', this.fig.nodes[edge[0]].x);
            line.setAttribute('y1', this.fig.nodes[edge[0]].y);
            line.setAttribute('x2', this.fig.nodes[edge[1]].x);
            line.setAttribute('y2', this.fig.nodes[edge[1]].y);
            line.setAttribute('stroke', this.color());
            line.setAttribute('class', 'meshspin-line');
            this.svg.appendChild(line);
        }
        if (this.debug) {
            this.drawDebugNodes();
        }
    };
    this.drawDebugNodes = function () {
        for (let n = 0; n < this.fig.nodes.length; n++) {
            var text = document.createElementNS(this.ns, 'text');
            text.setAttribute('x', this.fig.nodes[n].x);
            text.setAttribute('y', this.fig.nodes[n].y);
            text.appendChild(document.createTextNode(n));
            this.svg.appendChild(text);
            var circle = document.createElementNS(this.ns, 'circle');
            circle.setAttribute('cx', this.fig.nodes[n].x);
            circle.setAttribute('cy', this.fig.nodes[n].y);
            circle.setAttribute('r', '3px');
            circle.setAttribute('stroke', 'transparent');
            circle.setAttribute('fill', this.fig.nodes[n].z < 0 ? '#666' : 'black');
            this.svg.appendChild(circle);
        }
    };
    this.animationFrameCallback = function () {
        var ref = this;
        return function animate(now) {
            requestAnimationFrame(animate);
            if (!ref.lastFrame) {
                ref.lastFrame = now;
            }
            if ((now - ref.lastFrame) < 1000 / ref.fps) {
                return;
            }
            if (!ref.currentFrame) {
                ref.currentFrame = 0;
            }
            ++ref.currentFrame;
            ref.lastFrame = now;
            ref.draw();
        };
    };
    this.run = function () {
        requestAnimationFrame(this.animationFrameCallback());
    };
    this.getRotationOffset = function () {
        return this.staticRotation;
    };
    this.rotateByMouse = function () {
        var deltaFactor = 0.01;
        return {
            x: (this.Mouse.prev.x - this.Mouse.x) * deltaFactor,
            y: (this.Mouse.prev.y - this.Mouse.y) * deltaFactor,
            z: 0,
        };
    };
    this.colorStatic = function (color) {
        return function () {
            return color;
        };
    };
    this.color = this.colorStatic('currentColor');
    this.Mouse = {
        x: 0,
        y: 0,
        prev: { x: 0, y: 0, },
    };
    this.mouseInterval = null;
    this.mouseUpdate = function () {
        var ref = this;
        return function doMouseUpdate(e) {
            ref.Mouse = {
                x: e.pageX,
                y: e.pageY,
                prev: { x: ref.Mouse.x, y: ref.Mouse.y },
            };
            if (ref.mouseInterval) {
                clearInterval(ref.mouseInterval);
                ref.mouseInterval = null;
            }
            ref.mouseInterval = setInterval(function () {
                ref.Mouse.prev = { x: ref.Mouse.x, y: ref.Mouse.y };
            }, 100);
        };
    };
}
exports.default = default_1;

});
return ___scope___.entry = "meshspin.js";
});
FuseBox.expose([{"alias":"MeshSpin","pkg":"default/meshspin.js"}]);
FuseBox.main("default/meshspin.js");
})
((function(__root__){
if (__root__["FuseBox"]) return __root__["FuseBox"];
var $isServiceWorker = typeof ServiceWorkerGlobalScope !== "undefined";
var $isWebWorker = typeof WorkerGlobalScope !== "undefined";
var $isBrowser = (typeof window !== "undefined" && typeof window.navigator !== "undefined") || $isWebWorker || $isServiceWorker;
var g = $isBrowser ? ($isWebWorker || $isServiceWorker ? {} : window) : global;
if ($isBrowser) {
    g["global"] = $isWebWorker || $isServiceWorker ? {} : window;
}
__root__ = !$isBrowser || typeof __fbx__dnm__ !== "undefined" ? module.exports : __root__;
var $fsbx = $isBrowser
    ? $isWebWorker || $isServiceWorker
        ? {}
        : (window["__fsbx__"] = window["__fsbx__"] || {})
    : (g["$fsbx"] = g["$fsbx"] || {});
if (!$isBrowser) {
    g["require"] = require;
}
var $packages = ($fsbx.p = $fsbx.p || {});
var $events = ($fsbx.e = $fsbx.e || {});
function $getNodeModuleName(name) {
    var n = name.charCodeAt(0);
    var s = name.charCodeAt(1);
    if (!$isBrowser && s === 58) {
        return;
    }
    if ((n >= 97 && n <= 122) || n === 64) {
        if (n === 64) {
            var s_1 = name.split("/");
            var target = s_1.splice(2, s_1.length).join("/");
            return [s_1[0] + "/" + s_1[1], target || undefined];
        }
        var index = name.indexOf("/");
        if (index === -1) {
            return [name];
        }
        var first = name.substring(0, index);
        var second = name.substring(index + 1);
        return [first, second];
    }
}
function $getDir(filePath) {
    return filePath.substring(0, filePath.lastIndexOf("/")) || "./";
}
function $pathJoin() {
    var string = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        string[_i] = arguments[_i];
    }
    var parts = [];
    for (var i = 0, l = arguments.length; i < l; i++) {
        parts = parts.concat(arguments[i].split("/"));
    }
    var newParts = [];
    for (var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        if (!part || part === ".")
            continue;
        if (part === "..") {
            newParts.pop();
        }
        else {
            newParts.push(part);
        }
    }
    if (parts[0] === "")
        newParts.unshift("");
    return newParts.join("/") || (newParts.length ? "/" : ".");
}
function $ensureExtension(name) {
    var matched = name.match(/\.(\w{1,})$/);
    if (matched) {
        if (!matched[1]) {
            return name + ".js";
        }
        return name;
    }
    return name + ".js";
}
function $loadURL(url) {
    if ($isBrowser) {
        var d = document;
        var head = d.getElementsByTagName("head")[0];
        var target;
        if (/\.css$/.test(url)) {
            target = d.createElement("link");
            target.rel = "stylesheet";
            target.type = "text/css";
            target.href = url;
        }
        else {
            target = d.createElement("script");
            target.type = "text/javascript";
            target.src = url;
            target.async = true;
        }
        head.insertBefore(target, head.firstChild);
    }
}
function $loopObjKey(obj, func) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            func(key, obj[key]);
        }
    }
}
function $serverRequire(path) {
    return { server: require(path) };
}
function $getRef(name, o) {
    var basePath = o.path || "./";
    var pkgName = o.pkg || "default";
    var nodeModule = $getNodeModuleName(name);
    if (nodeModule) {
        basePath = "./";
        pkgName = nodeModule[0];
        if (o.v && o.v[pkgName]) {
            pkgName = pkgName + "@" + o.v[pkgName];
        }
        name = nodeModule[1];
    }
    if (name) {
        if (name.charCodeAt(0) === 126) {
            name = name.slice(2, name.length);
            basePath = "./";
        }
        else {
            if (!$isBrowser && (name.charCodeAt(0) === 47 || name.charCodeAt(1) === 58)) {
                return $serverRequire(name);
            }
        }
    }
    var pkg = $packages[pkgName];
    if (!pkg) {
        if ($isBrowser && FuseBox.target !== "electron") {
            throw "Package not found " + pkgName;
        }
        else {
            return $serverRequire(pkgName + (name ? "/" + name : ""));
        }
    }
    name = name ? name : "./" + pkg.s.entry;
    var filePath = $pathJoin(basePath, name);
    var validPath = $ensureExtension(filePath);
    var file = pkg.f[validPath];
    var wildcard;
    if (!file && validPath.indexOf("*") > -1) {
        wildcard = validPath;
    }
    if (!file && !wildcard) {
        validPath = $pathJoin(filePath, "/", "index.js");
        file = pkg.f[validPath];
        if (!file && filePath === ".") {
            validPath = (pkg.s && pkg.s.entry) || "index.js";
            file = pkg.f[validPath];
        }
        if (!file) {
            validPath = filePath + ".js";
            file = pkg.f[validPath];
        }
        if (!file) {
            file = pkg.f[filePath + ".jsx"];
        }
        if (!file) {
            validPath = filePath + "/index.jsx";
            file = pkg.f[validPath];
        }
    }
    return {
        file: file,
        wildcard: wildcard,
        pkgName: pkgName,
        versions: pkg.v,
        filePath: filePath,
        validPath: validPath,
    };
}
function $async(file, cb, o) {
    if (o === void 0) { o = {}; }
    if ($isBrowser) {
        if (o && o.ajaxed === file) {
            return console.error(file, "does not provide a module");
        }
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    var contentType = xmlhttp.getResponseHeader("Content-Type");
                    var content = xmlhttp.responseText;
                    if (/json/.test(contentType)) {
                        content = "module.exports = " + content;
                    }
                    else {
                        if (!/javascript/.test(contentType)) {
                            content = "module.exports = " + JSON.stringify(content);
                        }
                    }
                    var normalized = $pathJoin("./", file);
                    FuseBox.dynamic(normalized, content);
                    cb(FuseBox.import(file, { ajaxed: file }));
                }
                else {
                    console.error(file, "not found on request");
                    cb(undefined);
                }
            }
        };
        xmlhttp.open("GET", file, true);
        xmlhttp.send();
    }
    else {
        if (/\.(js|json)$/.test(file))
            return cb(g["require"](file));
        return cb("");
    }
}
function $trigger(name, args) {
    var e = $events[name];
    if (e) {
        for (var i in e) {
            var res = e[i].apply(null, args);
            if (res === false) {
                return false;
            }
        }
    }
}
function syntheticDefaultExportPolyfill(input) {
    if (input === null ||
        ["function", "object", "array"].indexOf(typeof input) === -1 ||
        input.hasOwnProperty("default")) {
        return;
    }
    if (Object.isFrozen(input)) {
        input.default = input;
        return;
    }
    Object.defineProperty(input, "default", {
        value: input,
        writable: true,
        enumerable: false,
    });
}
function $import(name, o) {
    if (o === void 0) { o = {}; }
    if (name.charCodeAt(4) === 58 || name.charCodeAt(5) === 58) {
        return $loadURL(name);
    }
    var ref = $getRef(name, o);
    if (ref.server) {
        return ref.server;
    }
    var file = ref.file;
    if (ref.wildcard) {
        var safeRegEx = new RegExp(ref.wildcard
            .replace(/\*/g, "@")
            .replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")
            .replace(/@@/g, ".*")
            .replace(/@/g, "[a-z0-9$_-]+"), "i");
        var pkg_1 = $packages[ref.pkgName];
        if (pkg_1) {
            var batch = {};
            for (var n in pkg_1.f) {
                if (safeRegEx.test(n)) {
                    batch[n] = $import(ref.pkgName + "/" + n);
                }
            }
            return batch;
        }
    }
    if (!file) {
        var asyncMode_1 = typeof o === "function";
        var processStopped = $trigger("async", [name, o]);
        if (processStopped === false) {
            return;
        }
        return $async(name, function (result) { return (asyncMode_1 ? o(result) : null); }, o);
    }
    var pkg = ref.pkgName;
    if (file.locals && file.locals.module)
        return file.locals.module.exports;
    var locals = (file.locals = {});
    var path = $getDir(ref.validPath);
    locals.exports = {};
    locals.module = { exports: locals.exports };
    locals.require = function (name, optionalCallback) {
        var result = $import(name, {
            pkg: pkg,
            path: path,
            v: ref.versions,
        });
        if (FuseBox["sdep"]) {
            syntheticDefaultExportPolyfill(result);
        }
        return result;
    };
    if ($isBrowser || !g["require"].main) {
        locals.require.main = { filename: "./", paths: [] };
    }
    else {
        locals.require.main = g["require"].main;
    }
    var args = [locals.module.exports, locals.require, locals.module, ref.validPath, path, pkg];
    $trigger("before-import", args);
    file.fn.apply(args[0], args);
    $trigger("after-import", args);
    return locals.module.exports;
}
var FuseBox = (function () {
    function FuseBox() {
    }
    FuseBox.global = function (key, obj) {
        if (obj === undefined)
            return g[key];
        g[key] = obj;
    };
    FuseBox.import = function (name, o) {
        return $import(name, o);
    };
    FuseBox.on = function (n, fn) {
        $events[n] = $events[n] || [];
        $events[n].push(fn);
    };
    FuseBox.exists = function (path) {
        try {
            var ref = $getRef(path, {});
            return ref.file !== undefined;
        }
        catch (err) {
            return false;
        }
    };
    FuseBox.remove = function (path) {
        var ref = $getRef(path, {});
        var pkg = $packages[ref.pkgName];
        if (pkg && pkg.f[ref.validPath]) {
            delete pkg.f[ref.validPath];
        }
    };
    FuseBox.main = function (name) {
        this.mainFile = name;
        return FuseBox.import(name, {});
    };
    FuseBox.expose = function (obj) {
        var _loop_1 = function (k) {
            var alias = obj[k].alias;
            var xp = $import(obj[k].pkg);
            if (alias === "*") {
                $loopObjKey(xp, function (exportKey, value) { return (__root__[exportKey] = value); });
            }
            else if (typeof alias === "object") {
                $loopObjKey(alias, function (exportKey, value) { return (__root__[value] = xp[exportKey]); });
            }
            else {
                __root__[alias] = xp;
            }
        };
        for (var k in obj) {
            _loop_1(k);
        }
    };
    FuseBox.dynamic = function (path, str, opts) {
        this.pkg((opts && opts.pkg) || "default", {}, function (___scope___) {
            ___scope___.file(path, function (exports, require, module, __filename, __dirname) {
                var res = new Function("__fbx__dnm__", "exports", "require", "module", "__filename", "__dirname", "__root__", str);
                res(true, exports, require, module, __filename, __dirname, __root__);
            });
        });
    };
    FuseBox.flush = function (shouldFlush) {
        var def = $packages["default"];
        for (var fileName in def.f) {
            if (!shouldFlush || shouldFlush(fileName)) {
                delete def.f[fileName].locals;
            }
        }
    };
    FuseBox.pkg = function (name, v, fn) {
        if ($packages[name])
            return fn($packages[name].s);
        var pkg = ($packages[name] = {});
        pkg.f = {};
        pkg.v = v;
        pkg.s = {
            file: function (name, fn) { return (pkg.f[name] = { fn: fn }); },
        };
        return fn(pkg.s);
    };
    FuseBox.addPlugin = function (plugin) {
        this.plugins.push(plugin);
    };
    FuseBox.packages = $packages;
    FuseBox.isBrowser = $isBrowser;
    FuseBox.isServer = !$isBrowser;
    FuseBox.plugins = [];
    return FuseBox;
}());
if (!$isBrowser) {
    g["FuseBox"] = FuseBox;
}

return __root__["FuseBox"] = FuseBox; } )(this))