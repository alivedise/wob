(function(window) {
  var _start = Date.now();

  function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[ Math.round(Math.random() * 15) ];
    }
    return color;
  }

  function getCenterPosition(a, b) {
    var x1 = a.x;
    var y1 = a.y;
    var x2 = b.x;
    var y2 = b.y;

    return {
      x: (x2 + x1) / 2,
      y: (y2 + y1) / 2
    }
  }

  var Environment = {
    TIME_FACTOR: 0.5,
    WIDTH: 320,
    HEIGHT: 200,
    init: function en_init() {
      this._instances = {};
      this.map = Raphael(0, 0, this.WIDTH, this.HEIGHT);
      this.renderRect();
      window.addEventListener('bug_request-render', this);
      window.addEventListener('bug_revoluted', this);
      window.addEventListener('bug_destroyed', this);
    },

    renderRect: function() {
      var dist = 10;
      for (var i = 0; i < this.WIDTH / dist; i++) {
        for (var j = 0; j < this.HEIGHT / dist; j++) {
          var r = this.map.rect(i * dist, j * dist, dist, dist);
          r.attr('stroke', 'silver');
        }
      }
    },

    overlap: function en_overlay(a, b) {
      var x1 = a.mapping.x;
      var y1 = a.mapping.y;
      var x2 = b.mapping.x;
      var y2 = b.mapping.y;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var r1 = a.size;
      var r2 = b.size;
      if ((dx * dx + dy * dy) > (r1 + r2) * (r1 + r2)) {
        return false;
      } else {
        return true;
      }
    },

    handleEvent: function en_handleEvent(evt) {
      switch (evt.type) {
        case 'bug_request-render':
          this.render(evt.detail);
          break;
        case 'bug_revoluted':
          this.revolute(evt.detail);
          break;
        case 'bug_destroyed':
          this.destroy(evt.detail);
          break;
      }
    },

    render: function en_render(creature) {
      if (creature.native) {
        var pos = this.getAvailablePosition();
        creature.mapping = {
          x: this.WIDTH * pos.x,
          y: this.HEIGHT * pos.y,
          c: get_random_color()
        }
      }
      var c = this.map.circle(creature.mapping.x, creature.mapping.y, creature.size);
      c.attr('fill', creature.mapping.c);
      c.attr('stroke', creature.native ? 'transparent' : 'black');
      c.attr('stroke-width', creature.generation);
      c.attr('stroke-opacity', 0.5);
      this._instances[creature.instanceID] = c;
      c.instanceID = creature.instanceID;
    },

    revolute: function en_revolute(creature) {
      var c = this._instances[creature.instanceID];
      if (c) {
        c.attr('r', creature.size);
        c.attr('storke-width', creature.generation);
      } else {
        console.log('Not in the database!');
      }
    },

    destroy: function en_destroy(creature) {
      var c = this._instances[creature.instanceID];
      if (c) {
        c.remove();
      } else {
        console.log('Not in the database!');
      }
    },

    getAvailablePosition: function en_getAvailablePosition() {
      return {
        x: Math.random(),
        y: Math.random()
      }
    }
  };

  var _id = 0;
  var Bug = function Bug(parents){
    this.instanceID = _id;
    Bug.instances[_id] = this;
    _id++;
    this.gene = {};
    // When we're born.
    if (!parents) {
      this.native = true;
      this.burn();
    } else {
      this.parents = parents;
      this.generation = Math.max(parents[0].generation, parents[1].generation) + 1;
      this.native = false;
      this.heredity();
    }
  };

  Bug.instances = {};

  /**
   * The life stage represented by a number.
   * @type {Number}
   */
  Bug.prototype.stage = 0;

  /**
   * The generation number.
   */
  Bug.prototype.generation = 1;

  Bug.prototype.gene = null;

  /**
   * Request to burn on the world.
   * Environment would deal with this request and give a suitable position.
   */
  Bug.prototype.burn = function() {
    this.publish('request-render', this);
    if (this.mapping) {
      this._dump('born in ' + JSON.stringify(this.mapping));
      this.revolute();
    } else {
      this._dump('burning failed.');
    }
  };

  Bug.prototype.native = true;

  Bug.prototype.heredity = function bug_heredity() {
    if (!this.parents) {
      console.warn('No parents.');
    }

    /*
    this.parents.forEach(function iterator(parent) {
      for (var property in parent.gene) {
        if (property in this.gene) {

        } else {
          this.gene[property] = parent.gene[property];
        }
      }
    }, this);
    */

    var pos = getCenterPosition(this.parents[0].mapping, this.parents[1].mapping);
    this.mapping = {
      x: pos.x,
      y: pos.y,
      c: get_random_color()
    };

    this.publish('request-render', this);
    this._dump('born with ' +
      JSON.stringify(this.mapping) + this.parents[0] + this.parents[1]);
    this.revolute();
  };

  Bug.prototype._dump = function bug__dump(msg) {
    console.log('[Bug ' + this.instanceID + '][' + (Date.now() - _start) + '][Gene ' + this.generation + '] ' + msg);
  };

  Bug.prototype.EVENT_PREFIX = 'bug_';

  Bug.prototype.publish = function bug_publish(eventName) {
    var evt = new CustomEvent(this.EVENT_PREFIX + eventName, {
      detail: this
    });

    window.dispatchEvent(evt);
  };

  Bug.prototype.size = 1;

  Bug.prototype.revolute = function bug_revolute() {
    if (this.stage < this.MAX_STAGE) {
      this.stage++;
      this.size = this.size + (1 + (Math.random() > 0.5 ? 1 : 0));
      this._dump('revolute to stage ' + this.stage + '; size becomes ' + this.size);
      this.publish('revoluted');
      this.resetLifeCycle();
      // Longer life check.
      this.MAX_STAGE = this.MAX_STAGE + (Math.random() <= 0.25 ? 1 : 0);
    } else {
      this.destroy();
    }
  };

  Bug.prototype.MAX_STAGE = 4;
  Bug.CYCLE_TIMEOUT = {
    '0': 5000,
    '1': 10000,
    '2': 30000,
    '3': 60000
  };

  Bug.prototype.resetLifeCycle = function() {
    clearTimeout(this._revolutionTimer);
    var TIMEOUT = Bug.CYCLE_TIMEOUT[this.stage] ? Bug.CYCLE_TIMEOUT[this.stage] : 10000;
    this._revolutionTimer =
      window.setTimeout(this.revolute.bind(this),
        Environment.TIME_FACTOR * TIMEOUT * (1 - Math.random()));
  };

  Bug.prototype.destroy = function bug_destroy() {
    this._dump('destroyed.');
    this.publish('destroyed');

    if (Bug.instances[this.instanceID]) {
      Bug.instances[this.instanceID] = null;
    }
  };

  var Combination = {
    INTERVAL: 3000,

    init: function c_init() {
      this.start();
    },

    combine: function c_combine() {
      if (this._checking) {
        console.log('CHECKING');
        return;
      }
      this._checking = true;
      for (var i in Bug.instances) {
        var A = Bug.instances[i];
        if (A === null)
          continue;

        if (A.overlapped)
          continue;

        for (var j in Bug.instances) {
          var B = Bug.instances[j];
          if (B === null)
            continue;

          if (i === j)
            continue;

          if (B.overlapped)
            continue;

          if (Environment.overlap(A, B)) {
            console.warn('OVERLAPPED!');
            A.overlapped = true;
            B.overlapped = true;
            new Bug([A, B]);
          } else {
            // console.log('NOT OVERLAPPED');
          }
        }
      }
      this._checking = false;
    },

    start: function c_start() {
      if (this._interval)
        window.clearInterval(this._interval);
      this._interval =
        window.setInterval(this.combine.bind(this), this.INTERVAL * Environment.TIME_FACTOR);
    },

    stop: function c_stop() {
      window.clearInterval(this._interval);
    }
  };

  var Life = {
    INTERVAL: 1000,

    run: 0,

    init: function li_init() {
      this.start();
    },

    start: function li_start() {
      if (this._interval) {
        window.clearInterval(this._interval);
      }

      this._interval =
        window.setInterval(this.generate.bind(this), this.INTERVAL * Environment.TIME_FACTOR)
    },

    generate: function li_generate() {
      this.run++;
      this.publish('update-interval', this.run);
      for (var i = 0; i < (Math.random() * 10 % 10); i++) {
        new Bug();
      }
    },

    stop: function li_stop() {
      window.clearInterval(this._interval);
    },

    publish: function(eventName, detail) {
      var evt = new CustomEvent(eventName, { detail: detail || this });
      window.dispatchEvent(evt);
    }
  };

  var DashBoard = {
    WIDTH: 100,
    count: 0,

    init: function() {
      this.map = Raphael(Environment.WIDTH, 0, this.WIDTH, Environment.HEIGHT);
      this.map.rect(0, 0, this.WIDTH, Environment.HEIGHT);
      window.addEventListener('update-interval', this);
      window.addEventListener('bug_request-render', this);
      window.addEventListener('bug_destroyed', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'update-interval':
          this.updateInterval(evt.detail);
          break;
        case 'bug_request-render':
          this.count++;
          this.updateCount(this.count);
          break;
        case 'bug_destroyed':
          this.count--;
          this.updateCount(this.count);
          break;
      }
    },

    updateCount: function(count) {
      if (!this._countText) {
        this._countText =
          this.map.text(5, 15, 'Count: ' + count).attr('text-anchor', 'start');
      }
      this._countText.attr('text', 'Count: ' + count);
    },

    updateInterval: function(interval) {
      if (!this._intervalText) {
        this._intervalText =
          this.map.text(5, 5, 'Run: ' + interval).attr('text-anchor', 'start');
      }
      this._intervalText.attr('text', 'Run: ' + interval);
    }
  }

  window.Life = Life;
  window.Bug = Bug;
  window.Environment = Environment;
  window.Combination = Combination;
  window.DashBoard = DashBoard;

  DashBoard.init();
  Environment.init();
  Life.init();
  Combination.init();
}(this));