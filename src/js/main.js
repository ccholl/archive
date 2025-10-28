// Main entry point for Personal Archive
import { ArchiveMenu } from './ArchiveMenu.js'
import { MenuItemAnimation } from './menu-item-animation.js'

// Initialize all modules

// Initialize archive menu
window.archiveMenu = new ArchiveMenu()

// Initialize menu item animation (允许事件传播到 ArchiveMenu)
window.menuItemAnimation = new MenuItemAnimation({
    debug: true,
    stopPropagation: false  // 允许事件继续传播
})

// ============ 背景图片切换 ============
let backgrounds = []
let currentBgIndex = 0

// 从 JSON 文件加载背景列表
fetch('assets/background/backgrounds.json')
    .then(res => res.json())
    .then(list => {
        backgrounds = list.map(filename => `assets/background/${filename}`)
        console.log('✅ 加载了', backgrounds.length, '张背景图片')
    })
    .catch(err => console.error('❌ 加载背景列表失败:', err))

document.addEventListener('keydown', (e) => {
    if (e.key === 'b' || e.key === 'B') {
        if (backgrounds.length === 0) return
        currentBgIndex = (currentBgIndex + 1) % backgrounds.length
        document.querySelector('.background').style.backgroundImage = `url('${backgrounds[currentBgIndex]}')`
    }
})

// ============ 懒加载游戏模块 ============
// 只在用户触发时才加载，避免首屏加载不必要的代码

// 辅助函数：动态加载外部脚本
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve(); // 已加载
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

// 懒加载：推箱子游戏
window.SimplePushBox = {
    instance: null,
    loading: false,

    async toggle() {
        if (this.loading) return;

        if (!this.instance) {
            this.loading = true;
            console.log('🎮 正在加载推箱子游戏...');

            try {
                const module = await import('./simple-pushbox.js');
                this.instance = new module.SimplePushBox();
                console.log('✅ 推箱子游戏加载完成');
            } catch (error) {
                console.error('❌ 加载推箱子游戏失败:', error);
                this.loading = false;
                return;
            }

            this.loading = false;
        }

        this.instance.toggle();
    },

    getStatus() {
        return this.instance?.getStatus() || { active: false };
    }
};

// 懒加载：图标游戏（包含 Matter.js）
window.IconGame = {
    instance: null,
    loading: false,

    async toggle() {
        if (this.loading) return;

        if (!this.instance) {
            this.loading = true;
            console.log('🎮 正在加载图标游戏...');

            try {
                // 先加载 Matter.js 物理引擎（如果还没加载）
                if (!window.Matter) {
                    console.log('📦 正在加载 Matter.js 物理引擎...');
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js');
                    console.log('✅ Matter.js 加载完成');
                }

                // 加载图标游戏模块
                const module = await import('./icon-game.js');
                this.instance = new module.IconGame();
                console.log('✅ 图标游戏加载完成');
            } catch (error) {
                console.error('❌ 加载图标游戏失败:', error);
                this.loading = false;
                return;
            }

            this.loading = false;
        }

        this.instance.toggle();
    },

    getStatus() {
        return this.instance?.getStatus() || false;
    }
};

// 兼容旧的 API
window.PushBoxGame = {
    toggle: () => window.SimplePushBox.toggle(),
    getStatus: () => window.SimplePushBox.getStatus()
};

window.IconGameMode = {
    toggle: () => window.IconGame.toggle(),
    getStatus: () => window.IconGame.getStatus()
};
