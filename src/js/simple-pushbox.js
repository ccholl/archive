// 超简化交互 - 寻找 ccholl 的游戏
// 探索模式：找到 ccholl 触发自我介绍

export class SimplePushBox {
    constructor() {
        this.active = false;
        this.player = null;
        this.cchollElement = null;
        this.moveStep = 20; // 每次移动距离
        this.playerPos = { x: 100, y: 100 };
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
        this.createPlayer();
        this.createCchollElement();
        this.bindControls();
        console.log('进入探索模式 - 寻找 ccholl');
    }

    exit() {
        this.active = false;
        if (this.player) {
            this.player.remove();
            this.player = null;
        }
        if (this.cchollElement) {
            this.cchollElement.remove();
            this.cchollElement = null;
        }

        // 移除事件监听器
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }

        console.log('退出探索模式');
    }

    createPlayer() {
        this.player = document.createElement('div');
        this.player.textContent = '@';
        this.player.style.cssText = `
            position: fixed;
            font-size: 20px;
            font-family: 'Courier New', monospace;
            color: black;
            z-index: 999;
            transition: all 0.2s ease;
            pointer-events: none;
            left: ${this.playerPos.x}px;
            top: ${this.playerPos.y}px;
        `;
        document.body.appendChild(this.player);
    }

    createCchollElement() {
        this.cchollElement = document.createElement('div');
        this.cchollElement.textContent = 'ccholl';

        // 随机位置（避开边缘）
        const randomX = Math.random() * (window.innerWidth - 200) + 100;
        const randomY = Math.random() * (window.innerHeight - 200) + 100;

        this.cchollElement.style.cssText = `
            position: fixed;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            color: black;
            z-index: 998;
            pointer-events: none;
            left: ${randomX}px;
            top: ${randomY}px;
        `;
        document.body.appendChild(this.cchollElement);

        console.log(`ccholl 放置在位置: (${Math.round(randomX)}, ${Math.round(randomY)})`);
    }


    bindControls() {
        this.keyHandler = (e) => {
            if (!this.active) return;

            switch(e.key.toLowerCase()) {
                case 'escape':
                    this.exit();
                    break;
                case 'w':
                case 'arrowup':
                    this.movePlayer(0, -this.moveStep);
                    break;
                case 's':
                case 'arrowdown':
                    this.movePlayer(0, this.moveStep);
                    break;
                case 'a':
                case 'arrowleft':
                    this.movePlayer(-this.moveStep, 0);
                    break;
                case 'd':
                case 'arrowright':
                    this.movePlayer(this.moveStep, 0);
                    break;
            }
            e.preventDefault();
        };

        // 点击页面其他地方退出探索模式
        this.clickHandler = (e) => {
            if (!this.active) return;

            // 如果点击的不是@符号或ccholl，就退出
            if (e.target !== this.player && e.target !== this.cchollElement) {
                this.exit();
            }
        };

        document.addEventListener('keydown', this.keyHandler);
        document.addEventListener('click', this.clickHandler);
    }

    movePlayer(dx, dy) {
        const newX = this.playerPos.x + dx;
        const newY = this.playerPos.y + dy;

        // 检查边界
        if (newX < 0 || newX > window.innerWidth - 30 ||
            newY < 0 || newY > window.innerHeight - 30) {
            return;
        }

        // 更新位置
        this.playerPos.x = newX;
        this.playerPos.y = newY;
        this.updatePlayerPosition();

        // 检查是否碰到 ccholl
        this.checkCchollCollision();
    }

    checkCchollCollision() {
        if (!this.cchollElement) return;

        const playerRect = this.player.getBoundingClientRect();
        const cchollRect = this.cchollElement.getBoundingClientRect();

        // 检测 @ 是否在 ccholl 左边且接近
        const isLeftSide = playerRect.right >= cchollRect.left - 10 &&
                          playerRect.right <= cchollRect.left + 20;
        const isVerticallyAligned = Math.abs(playerRect.top - cchollRect.top) < 30;

        if (isLeftSide && isVerticallyAligned) {
            console.log('碰撞检测：@ 在 ccholl 左边！');
            this.triggerIntroPage();
        }
    }

    triggerIntroPage() {
        console.log('跳转到自我介绍页面...');

        // 简单的跳转效果
        this.cchollElement.style.transform = 'scale(1.1)';

        setTimeout(() => {
            window.location.href = 'about-ccholl.html';
        }, 300);
    }

    updatePlayerPosition() {
        this.player.style.left = `${this.playerPos.x}px`;
        this.player.style.top = `${this.playerPos.y}px`;
    }


    getStatus() {
        return {
            active: this.active,
            mode: 'explore',
            playerPos: this.playerPos,
            cchollFound: !!this.cchollElement
        };
    }
}
