export function createDamageNumbers(scene, camera, config = {}) {
  const defaults = {
    damageNumbersEnabled: true,
    color: '#ff4444',
    size: 32,
    duration: 1500,
    floatDistance: 2
  };
  const settings = { ...defaults, ...config };
  const activeNumbers = [];
  let numberGroup = null;

  function _ensureGroup() {
    if (!numberGroup) {
      numberGroup = document.createElement('div');
      numberGroup.id = 'damage-numbers-container';
      numberGroup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(numberGroup);
    }
  }

  function _worldToScreenCoords(worldPos) {
    if (!camera) return null;
    const vec3 = new (window.THREE?.Vector3 || (function() {
      return function(x, y, z) { this.x = x; this.y = y; this.z = z; };
    })())(worldPos.x, worldPos.y, worldPos.z);

    if (window.THREE?.Vector3 && camera.worldToScreen) {
      return camera.worldToScreen(vec3);
    }

    const pos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
    const viewport = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      width: window.innerWidth,
      height: window.innerHeight
    };

    return {
      x: viewport.x + (pos.x * 50),
      y: viewport.y - (pos.y * 50)
    };
  }

  function addNumber(damage, worldPos, options = {}) {
    if (!settings.damageNumbersEnabled || !numberGroup) return;

    _ensureGroup();

    const startTime = Date.now();
    const element = document.createElement('div');
    const color = options.color || (damage > 25 ? '#ff0000' : '#ff4444');
    const size = options.size || (32 + damage / 10);
    const screenPos = _worldToScreenCoords(worldPos);

    if (!screenPos) return;

    element.textContent = Math.ceil(damage);
    element.style.cssText = `
      position: absolute;
      left: ${screenPos.x}px;
      top: ${screenPos.y}px;
      color: ${color};
      font-size: ${size}px;
      font-weight: bold;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      font-family: system-ui, -apple-system, sans-serif;
    `;

    numberGroup.appendChild(element);

    const number = {
      damage: Math.ceil(damage),
      element,
      startTime,
      duration: options.duration || settings.duration,
      floatDistance: options.floatDistance || settings.floatDistance,
      isActive() { return Date.now() - this.startTime < this.duration },
      getAlpha() {
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, 1 - elapsed / this.duration);
      },
      getYOffset() {
        const elapsed = Date.now() - this.startTime;
        return (elapsed / this.duration) * this.floatDistance;
      }
    };

    activeNumbers.push(number);
    return number;
  }

  function update() {
    const toRemove = [];

    for (let i = 0; i < activeNumbers.length; i++) {
      const num = activeNumbers[i];
      if (!num.isActive()) {
        if (num.element.parentNode) num.element.parentNode.removeChild(num.element);
        toRemove.push(i);
        continue;
      }

      const alpha = num.getAlpha();
      const yOffset = num.getYOffset();
      num.element.style.opacity = alpha;
      num.element.style.transform = `translate(-50%, calc(-50% - ${yOffset * 30}px))`;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      activeNumbers.splice(toRemove[i], 1);
    }
  }

  function getActiveNumbers() {
    return activeNumbers.filter(n => n.isActive());
  }

  function cleanup() {
    activeNumbers.forEach(n => {
      if (n.element.parentNode) n.element.parentNode.removeChild(n.element);
    });
    activeNumbers.length = 0;
    if (numberGroup && numberGroup.parentNode) {
      numberGroup.parentNode.removeChild(numberGroup);
      numberGroup = null;
    }
  }

  return {
    addNumber,
    update,
    getActiveNumbers,
    cleanup
  };
}
