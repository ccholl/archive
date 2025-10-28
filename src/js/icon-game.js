// Icon Game - Pushable Icons Mode with Matter.js Physics

export class IconGame {
    constructor() {
        this.active = false;
        this.player = null;
        this.playerBody = null;
        this.icons = [];
        this.moveForce = 0.002; // 移动力度
        this.playerPos = { x: 200, y: 200 };
        this.keyHandler = null;
        this.engine = null;
        this.world = null;
        this.runner = null;
        this.keys = {}; // 追踪按键状态
    }

    toggle() {
        if (this.active) {
            this.exit();
        } else {
            this.enter();
        }
    }

    enter() {
        this.active = true;
        console.log('进入图标游戏模式 (Matter.js 物理引擎)');

        // 隐藏菜单容器的普通交互
        const menuContainer = document.querySelector('.menu-container');
        if (menuContainer) {
            menuContainer.style.pointerEvents = 'none';
        }

        // 创建 Matter.js 物理世界
        this.createPhysicsWorld();

        // 收集所有图标元素
        this.collectIcons();

        // 创建玩家
        this.createPlayer();

        // 绑定控制
        this.bindControls();

        // 使图标可推动
        this.makeIconsPushable();

        // 启动物理引擎和渲染循环
        this.startPhysics();
    }

    exit() {
        this.active = false;
        console.log('退出图标游戏模式');

        // 停止物理引擎
        this.stopPhysics();

        // 恢复菜单交互
        const menuContainer = document.querySelector('.menu-container');
        if (menuContainer) {
            menuContainer.style.pointerEvents = 'auto';
        }

        // 移除玩家
        if (this.player) {
            this.player.remove();
            this.player = null;
            this.playerBody = null;
        }

        // 恢复图标状态
        this.restoreIcons();

        // 移除控制
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            document.removeEventListener('keyup', this.keyUpHandler);
            this.keyHandler = null;
            this.keyUpHandler = null;
        }

        // 清理按键状态
        this.keys = {};
    }

    getStatus() {
        return this.active;
    }

    // 创建 Matter.js 物理世界
    createPhysicsWorld() {
        const { Engine, World } = Matter;

        // 创建引擎（禁用重力，推箱子不需要重力）
        this.engine = Engine.create({
            gravity: { x: 0, y: 0 }
        });
        this.world = this.engine.world;

        console.log('Matter.js 物理世界已创建');
    }

    // 启动物理引擎
    startPhysics() {
        const { Runner } = Matter;

        // 创建运行器
        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);

        // 启动渲染循环（同步 DOM 与物理体）
        this.renderLoop();

        console.log('物理引擎已启动');
    }

    // 停止物理引擎
    stopPhysics() {
        if (this.runner) {
            const { Runner, Engine, World } = Matter;
            Runner.stop(this.runner);
            Engine.clear(this.engine);
            World.clear(this.world, false);
            this.runner = null;
            this.engine = null;
            this.world = null;
        }
    }

    // 渲染循环：同步 DOM 元素与物理体位置
    renderLoop() {
        if (!this.active) return;

        // 同步玩家位置
        if (this.playerBody && this.player) {
            this.player.style.left = this.playerBody.position.x - 15 + 'px';
            this.player.style.top = this.playerBody.position.y - 15 + 'px';
        }

        // 同步图标位置
        this.icons.forEach(iconData => {
            if (iconData.body && iconData.clone) {
                iconData.clone.style.left = iconData.body.position.x - iconData.width / 2 + 'px';
                iconData.clone.style.top = iconData.body.position.y - iconData.height / 2 + 'px';
            }
        });

        // 持续循环
        requestAnimationFrame(() => this.renderLoop());
    }

    // 收集所有菜单图标
    collectIcons() {
        this.icons = [];
        const iconElements = document.querySelectorAll('.menu-icon');

        iconElements.forEach(icon => {
            const rect = icon.getBoundingClientRect();

            // 克隆 SVG 图标
            const clone = icon.cloneNode(true);

            this.icons.push({
                original: icon,
                clone: clone,
                originalPos: { x: rect.left, y: rect.top },
                currentPos: { x: rect.left, y: rect.top },
                width: rect.width,
                height: rect.height
            });
        });

        console.log(`收集了 ${this.icons.length} 个图标`);
    }

    // 使图标可推动（使用 Matter.js 物理体）
    makeIconsPushable() {
        const { Bodies, World } = Matter;

        this.icons.forEach(iconData => {
            const clone = iconData.clone;

            // 隐藏原始图标（保持布局）
            iconData.original.style.visibility = 'hidden';

            // 计算中心位置
            const centerX = iconData.currentPos.x + iconData.width / 2;
            const centerY = iconData.currentPos.y + iconData.height / 2;

            // 创建物理体（矩形，可移动）
            iconData.body = Bodies.rectangle(centerX, centerY, iconData.width, iconData.height, {
                friction: 0.8,
                frictionStatic: 1,
                restitution: 0, // 无弹性
                density: 0.01, // 低密度，易推动
                label: 'icon'
            });

            // 添加到物理世界
            World.add(this.world, iconData.body);

            // 设置克隆体为绝对定位
            clone.style.position = 'fixed';
            clone.style.left = iconData.currentPos.x + 'px';
            clone.style.top = iconData.currentPos.y + 'px';
            clone.style.zIndex = '100';
            clone.style.transition = 'none'; // 禁用过渡，物理引擎控制位置

            // 添加视觉效果
            clone.classList.add('pushable-icon');

            // 添加到 body
            document.body.appendChild(clone);
        });

        console.log(`已创建 ${this.icons.length} 个物理体图标`);
    }

    // 恢复图标状态
    restoreIcons() {
        this.icons.forEach(iconData => {
            // 显示原始图标
            iconData.original.style.visibility = '';

            // 移除克隆体
            if (iconData.clone && iconData.clone.parentNode) {
                iconData.clone.remove();
            }
        });
        this.icons = [];
    }

    // 创建玩家（使用 Matter.js 物理体）
    createPlayer() {
        const { Bodies, World } = Matter;

        // 创建玩家物理体（圆形）
        this.playerBody = Bodies.circle(this.playerPos.x + 15, this.playerPos.y + 15, 15, {
            friction: 0.8,
            frictionAir: 0.1, // 空气阻力
            restitution: 0,
            density: 0.02, // 比图标重一点，可以推动它们
            label: 'player'
        });

        // 添加到物理世界
        World.add(this.world, this.playerBody);

        // 创建玩家 DOM 元素
        this.player = document.createElement('div');
        this.player.className = 'icon-game-player';
        this.player.textContent = '●';
        this.player.style.position = 'fixed';
        this.player.style.left = this.playerPos.x + 'px';
        this.player.style.top = this.playerPos.y + 'px';
        this.player.style.width = '30px';
        this.player.style.height = '30px';
        this.player.style.backgroundColor = 'rgba(255, 100, 100, 0.8)';
        this.player.style.borderRadius = '50%';
        this.player.style.display = 'flex';
        this.player.style.alignItems = 'center';
        this.player.style.justifyContent = 'center';
        this.player.style.fontSize = '20px';
        this.player.style.color = '#fff';
        this.player.style.zIndex = '200';
        this.player.style.cursor = 'move';
        this.player.style.transition = 'none'; // 禁用过渡，物理引擎控制位置

        document.body.appendChild(this.player);

        console.log('玩家物理体已创建');
    }

    // 绑定键盘控制（使用力）
    bindControls() {
        // 键盘按下
        this.keyHandler = (e) => {
            if (!this.active) return;

            const key = e.key.toLowerCase();

            // 退出按键
            if (key === 'escape' || key === 'p') {
                this.exit();
                return;
            }

            // 记录按键状态
            if (key === 'w' || key === 'arrowup') {
                this.keys.up = true;
                e.preventDefault();
            }
            if (key === 's' || key === 'arrowdown') {
                this.keys.down = true;
                e.preventDefault();
            }
            if (key === 'a' || key === 'arrowleft') {
                this.keys.left = true;
                e.preventDefault();
            }
            if (key === 'd' || key === 'arrowright') {
                this.keys.right = true;
                e.preventDefault();
            }
        };

        // 键盘释放
        this.keyUpHandler = (e) => {
            if (!this.active) return;

            const key = e.key.toLowerCase();

            if (key === 'w' || key === 'arrowup') {
                this.keys.up = false;
            }
            if (key === 's' || key === 'arrowdown') {
                this.keys.down = false;
            }
            if (key === 'a' || key === 'arrowleft') {
                this.keys.left = false;
            }
            if (key === 'd' || key === 'arrowright') {
                this.keys.right = false;
            }
        };

        document.addEventListener('keydown', this.keyHandler);
        document.addEventListener('keyup', this.keyUpHandler);

        // 启动移动循环
        this.startMovementLoop();
    }

    // 移动循环：根据按键状态施加力
    startMovementLoop() {
        const applyForces = () => {
            if (!this.active || !this.playerBody) return;

            const { Body } = Matter;
            let forceX = 0;
            let forceY = 0;

            // 根据按键状态计算力的方向
            if (this.keys.up) forceY -= this.moveForce;
            if (this.keys.down) forceY += this.moveForce;
            if (this.keys.left) forceX -= this.moveForce;
            if (this.keys.right) forceX += this.moveForce;

            // 施加力
            if (forceX !== 0 || forceY !== 0) {
                Body.applyForce(this.playerBody, this.playerBody.position, {
                    x: forceX,
                    y: forceY
                });
            }

            // 继续循环
            if (this.active) {
                requestAnimationFrame(applyForces);
            }
        };

        applyForces();
    }

}
