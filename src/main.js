/**
 * WHACK-A-WAVE
 * An Arcade Game About Controlling the Basic Reproduction Number
 * 
 * A 60-second arcade strategy edutainment game where the player controls pandemic waves
 * by managing Rₜ (the basic reproduction number) across multiple regions using different
 * public-health interventions.
 */
import { initBackground, pauseBackground, resumeBackground } from './background.js';

// ============================================================================
// GAME CONSTANTS - All values from the design document
// ============================================================================
const GAME_CONFIG = {
    // Interventions
    interventions: {
        mask: {
            name: 'Mask Mandate',
            color: 0x3b82f6, // Blue
            rtReduction: 0.20,
            deployDelay: 1.0,
            activeDuration: 5.0,
            cooldown: 6.0,
            rebound: 0.05,
            reboundDuration: 4.0
        },
        vaccine: {
            name: 'Vaccine Push',
            color: 0x22c55e, // Green
            rtReduction: 0.35,
            deployDelay: 3.0,
            activeDuration: 8.0,
            cooldown: 10.0,
            rebound: 0.10,
            reboundDuration: 10.0
        },
        lockdown: {
            name: 'Lockdown',
            color: 0xef4444, // Red
            rtReduction: 0.60,
            deployDelay: 0.75,
            activeDuration: 3.0,
            cooldown: 12.0,
            rebound: 0.20,
            reboundDuration: 4.0
        }
    },
    // Drift mechanics
    drift: {
        baseline: 0.008,
        escalated: 0.015,
        escalationThreshold: 3, // Number of regions > 1.2 to trigger escalation
        escalationRt: 1.2
    },
    // Win condition
    win: {
        targetRt: 1.0,
        sustainDuration: 8.0
    },
    // Game timing
    game: {
        duration: 60.0
    },
    // Level 1 settings
    level1: {
        regionCount: 6,
        initialRtMin: 0.98,
        initialRtMax: 1.05
    },
    // Visual thresholds for region colors
    rtThresholds: {
        green: 0.95,
        yellow: 1.05,
        orange: 1.20
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function getRtColor(rt) {
    if (rt < GAME_CONFIG.rtThresholds.green) return 0x22c55e; // Green
    if (rt < GAME_CONFIG.rtThresholds.yellow) return 0xeab308; // Yellow
    if (rt < GAME_CONFIG.rtThresholds.orange) return 0xf97316; // Orange
    return 0xef4444; // Red
}

function lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}

// ============================================================================
// BOOT SCENE - Preload all assets
// ============================================================================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Load audio assets
        // this.load.audio('click', 'assets/audio/click.wav');
        // this.load.audio('bgm', 'assets/audio/bgm.wav');
    }

    create() {
        // Start background music (loops throughout the game)
        // this.sound.play('bgm', {
        //     loop: true,
        //     volume: 0.4
        // });

        this.scene.start('WelcomeScene');
    }
}

// ============================================================================
// WELCOME SCENE
// ============================================================================
class WelcomeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WelcomeScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Initialize and show 3D background
        if (!window.backgroundInitialized) {
            initBackground();
            window.backgroundInitialized = true;
        } else {
            resumeBackground();
        }
        const bgUI = document.getElementById('background-ui');
        if (bgUI) bgUI.style.display = 'block';

        // Title text - sequential fade-in
        const texts = [
            { text: 'WELCOME, TRAINEE SCIENTIST', y: height * 0.25, size: 28, delay: 0 },
            { text: 'Year: 2029', y: height * 0.38, size: 20, delay: 800 },
            { text: 'COVID has resurfaced in waves.', y: height * 0.48, size: 18, delay: 1600 },
            { text: 'Your task: control transmission before time runs out.', y: height * 0.58, size: 18, delay: 2400 }
        ];

        texts.forEach(({ text, y, size, delay }) => {
            const textObj = this.add.text(width / 2, y, text, {
                fontFamily: 'monospace',
                fontSize: `${size}px`,
                color: '#00ffff',
                align: 'center'
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: textObj,
                alpha: 1,
                duration: 800,
                delay: delay,
                ease: 'Power2'
            });
        });

        // Begin Training button
        const buttonY = height * 0.78;
        const button = this.add.container(width / 2, buttonY).setAlpha(0);

        const buttonBg = this.add.rectangle(0, 0, 220, 50, 0x00ffff, 0.2)
            .setStrokeStyle(2, 0x00ffff);
        const buttonText = this.add.text(0, 0, '▶ Begin Training', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#00ffff'
        }).setOrigin(0.5);

        button.add([buttonBg, buttonText]);
        button.setSize(220, 50);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            buttonBg.setFillStyle(0x00ffff, 0.4);
        });
        button.on('pointerout', () => {
            buttonBg.setFillStyle(0x00ffff, 0.2);
        });
        button.on('pointerdown', () => {
            // this.sound.play('click');
            this.scene.start('TrainingScene');
        });

        // Fade in button after text
        this.tweens.add({
            targets: button,
            alpha: 1,
            duration: 800,
            delay: 3200
        });
    }

}

// ============================================================================
// TRAINING SCENE
// ============================================================================
class TrainingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TrainingScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Dark background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

        // Hide fancy background UI
        const bgUI = document.getElementById('background-ui');
        if (bgUI) bgUI.style.display = 'none';
        pauseBackground(); // Pause background when entering training
        this.createGridOverlay();

        // Training label
        this.add.text(20, 20, 'Training Simulation', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffff00'
        });

        // Skip training button (appears after step 1)
        this.skipButton = this.createButton(width - 220, 20, "I don't need training", 210, 30, () => {
            // this.sound.play('click');
            this.scene.start('GameScene');
        }).setAlpha(0);

        // Training state
        this.currentStep = 1;
        this.regionRt = 1.00;
        this.pulseScale = 1;
        this.pulseSpeed = 0;

        // Create main region for training
        this.createTrainingRegion();

        // Create Dr. Rao dialogue box
        this.createDialogueBox();

        // Create intervention buttons (initially hidden)
        this.createInterventionButtons();

        // Create second region container (for step 7)
        this.secondRegion = null;

        // Start step 1
        this.showStep(1);
    }

    createGridOverlay() {
        const { width, height } = this.scale;
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00ffff, 0.05);

        const gridSize = 40;
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        graphics.strokePath();
    }

    createTrainingRegion() {
        const { width, height } = this.scale;

        this.regionContainer = this.add.container(width / 2, height / 2 - 40);

        // Pulse circle (outer glow)
        this.pulseCircle = this.add.circle(0, 0, 80, 0x00ffff, 0.1);

        // Main region circle
        this.regionCircle = this.add.circle(0, 0, 60, 0x22c55e, 0.3)
            .setStrokeStyle(3, 0x22c55e);

        // Rt display
        this.rtText = this.add.text(0, 0, '1.00', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.rtLabel = this.add.text(0, 35, 'Rₜ', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        this.regionContainer.add([this.pulseCircle, this.regionCircle, this.rtText, this.rtLabel]);
    }

    createDialogueBox() {
        const { width, height } = this.scale;

        this.dialogueContainer = this.add.container(width / 2, height - 100);

        const boxBg = this.add.rectangle(0, 0, width - 60, 80, 0x1a1a2e, 0.9)
            .setStrokeStyle(1, 0x00ffff, 0.5);

        this.dialogueName = this.add.text(-((width - 60) / 2) + 20, -25, 'Dr. Rao:', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#00ffff'
        });

        this.dialogueText = this.add.text(0, 5, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 100 }
        }).setOrigin(0.5, 0.5);

        this.dialogueContainer.add([boxBg, this.dialogueName, this.dialogueText]);

        // Understood button
        this.understoodButton = this.createButton(width / 2, height - 30, 'Understood', 140, 36, () => {
            // this.sound.play('click');
            this.nextStep();
        });
    }

    createInterventionButtons() {
        const { width, height } = this.scale;

        this.interventionContainer = this.add.container(0, 0).setAlpha(0);

        const buttonY = height - 180;
        const buttonSpacing = 150;
        const startX = width / 2 - buttonSpacing;

        const interventionTypes = ['mask', 'vaccine', 'lockdown'];
        const labels = ['🟦 Mask', '🟩 Vaccine', '🟥 Lockdown'];

        this.interventionBtns = {};

        interventionTypes.forEach((type, i) => {
            const x = startX + i * buttonSpacing;
            const config = GAME_CONFIG.interventions[type];

            const container = this.add.container(x, buttonY);

            const bg = this.add.rectangle(0, 0, 120, 45, config.color, 0.3)
                .setStrokeStyle(2, config.color);
            const text = this.add.text(0, 0, labels[i], {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffffff'
            }).setOrigin(0.5);

            container.add([bg, text]);
            container.setSize(120, 45);
            container.setInteractive({ useHandCursor: true });
            container.setData('type', type);
            container.setData('bg', bg);

            container.on('pointerdown', () => {
                // this.sound.play('click');
                this.selectIntervention(type);
            });

            this.interventionBtns[type] = container;
            this.interventionContainer.add(container);
        });

        this.selectedIntervention = null;
    }

    createButton(x, y, label, w, h, callback) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, w, h, 0x00ffff, 0.2)
            .setStrokeStyle(2, 0x00ffff);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#00ffff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => bg.setFillStyle(0x00ffff, 0.4));
        container.on('pointerout', () => bg.setFillStyle(0x00ffff, 0.2));
        container.on('pointerdown', callback);

        return container;
    }

    showStep(step) {
        this.currentStep = step;
        this.understoodButton.setAlpha(1);

        // Reset any pulsing highlights
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.highlightTween = null;
        }

        switch (step) {
            case 1:
                this.regionRt = 1.00;
                this.pulseSpeed = 0;
                this.dialogueText.setText('"This number is Rₜ — the basic reproduction number."');
                break;

            case 2:
                this.skipButton.setAlpha(1);
                this.dialogueText.setText('"It tells us how many people one infected person spreads the virus to."');
                // Animate Rt from 1.00 to 1.15
                this.tweens.addCounter({
                    from: 1.00,
                    to: 1.15,
                    duration: 2000,
                    onUpdate: (tween) => {
                        this.regionRt = tween.getValue();
                        this.pulseSpeed = (this.regionRt - 1) * 10;
                    }
                });
                break;

            case 3:
                this.dialogueText.setText('"When Rₜ is above 1, outbreaks grow."');
                this.tweens.addCounter({
                    from: this.regionRt,
                    to: 1.20,
                    duration: 1500,
                    onUpdate: (tween) => {
                        this.regionRt = tween.getValue();
                        this.pulseSpeed = (this.regionRt - 1) * 15;
                    }
                });
                break;

            case 4:
                this.dialogueText.setText('"When Rₜ stays below 1, outbreaks shrink."');
                this.tweens.addCounter({
                    from: this.regionRt,
                    to: 0.90,
                    duration: 2000,
                    onUpdate: (tween) => {
                        this.regionRt = tween.getValue();
                        this.pulseSpeed = Math.max(0, (this.regionRt - 0.8) * 5);
                    }
                });
                break;

            case 5:
                this.dialogueText.setText('"If the Average Rₜ stays below 1 for 8 seconds before time runs out, you win."');
                // Show brief HUD demo
                this.showHUDDemo();
                break;

            case 6:
                this.regionRt = 1.15;
                this.pulseSpeed = 1.5;
                this.dialogueText.setText('"Interventions change behavior. They lower Rₜ — but only temporarily."');
                // Show intervention buttons
                this.interventionContainer.setAlpha(1);
                this.understoodButton.setAlpha(0);
                // Wait for player to select mask and apply to region
                this.awaitingAction = 'select_mask';
                this.highlightButton('mask');
                break;

            case 7:
                this.dialogueText.setText('"You can manage multiple regions at once — just not the same region twice. Try applying Vaccine to the second region."');
                // Create second region
                this.createSecondRegion();
                this.awaitingAction = 'select_vaccine';
                this.highlightButton('vaccine');
                this.understoodButton.setAlpha(0);
                break;

            case 8:
                this.dialogueText.setText('"Remember… When interventions end, transmission returns gradually."');
                // Demonstrate rebound
                this.showRebound();
                break;

            case 9:
                // Transition to live game
                this.showTransition();
                break;
        }

        this.updateRegionVisuals();
    }

    nextStep() {
        if (this.currentStep < 9) {
            this.showStep(this.currentStep + 1);
        }
    }

    highlightButton(type) {
        const btn = this.interventionBtns[type];
        if (!btn) return;

        const bg = btn.getData('bg');
        this.highlightTween = this.tweens.add({
            targets: bg,
            alpha: { from: 0.3, to: 0.8 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    highlightRegion(container) {
        this.regionHighlightTween = this.tweens.add({
            targets: container,
            scaleX: { from: 1, to: 1.1 },
            scaleY: { from: 1, to: 1.1 },
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    }

    selectIntervention(type) {
        if (this.awaitingAction === 'select_mask' && type !== 'mask') {
            return; // Only allow mask selection in step 6
        }
        if (this.awaitingAction === 'select_vaccine' && type !== 'vaccine') {
            return;
        }

        this.selectedIntervention = type;

        // Update button visuals
        Object.entries(this.interventionBtns).forEach(([t, btn]) => {
            const bg = btn.getData('bg');
            const config = GAME_CONFIG.interventions[t];
            if (t === type) {
                bg.setFillStyle(config.color, 0.6);
                bg.setStrokeStyle(3, 0xffffff);
            } else {
                bg.setFillStyle(config.color, 0.3);
                bg.setStrokeStyle(2, config.color);
            }
        });

        // Stop highlight tween
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.highlightTween = null;
        }

        // Now highlight region
        if (this.awaitingAction === 'select_mask') {
            this.awaitingAction = 'apply_to_region';
            this.makeRegionClickable();
            this.highlightRegion(this.regionContainer);
        } else if (this.awaitingAction === 'select_vaccine') {
            this.awaitingAction = 'apply_to_region2';
            this.makeSecondRegionClickable();
            this.highlightRegion(this.secondRegion);
        }
    }

    makeRegionClickable() {
        this.regionCircle.setInteractive({ useHandCursor: true });
        this.regionCircle.on('pointerdown', () => {
            if (this.awaitingAction === 'apply_to_region') {
                // this.sound.play('click');
                this.applyInterventionToRegion(1);
            }
        });
    }

    makeSecondRegionClickable() {
        if (this.secondRegionCircle) {
            this.secondRegionCircle.setInteractive({ useHandCursor: true });
            this.secondRegionCircle.on('pointerdown', () => {
                if (this.awaitingAction === 'apply_to_region2') {
                    // this.sound.play('click');
                    this.applyInterventionToRegion(2);
                }
            });
        }
    }

    applyInterventionToRegion(regionNum) {
        if (this.regionHighlightTween) {
            this.regionHighlightTween.stop();
            this.regionHighlightTween = null;
        }

        const config = GAME_CONFIG.interventions[this.selectedIntervention];

        if (regionNum === 1) {
            this.regionContainer.setScale(1);
            // Show deployment animation
            this.regionCircle.setStrokeStyle(3, config.color);
            this.regionCircle.setFillStyle(config.color, 0.4);

            // Show "Deploying..." text
            this.dialogueText.setText(`Deploying ${config.name}…\n"That region is now locked. Other regions are still available."`);

            // Animate Rt reduction after delay
            this.time.delayedCall(config.deployDelay * 1000, () => {
                this.tweens.addCounter({
                    from: this.regionRt,
                    to: this.regionRt - config.rtReduction,
                    duration: 500,
                    onUpdate: (tween) => {
                        this.regionRt = tween.getValue();
                    }
                });
            });

            this.awaitingAction = null;
            this.understoodButton.setAlpha(1);
        } else if (regionNum === 2) {
            this.secondRegion.setScale(1);
            this.secondRegionCircle.setStrokeStyle(3, config.color);
            this.secondRegionCircle.setFillStyle(config.color, 0.4);

            // Animate Rt reduction
            this.time.delayedCall(config.deployDelay * 1000, () => {
                this.tweens.addCounter({
                    from: this.secondRegionRt,
                    to: this.secondRegionRt - config.rtReduction,
                    duration: 500,
                    onUpdate: (tween) => {
                        this.secondRegionRt = tween.getValue();
                        this.secondRtText.setText(this.secondRegionRt.toFixed(2));
                    }
                });
            });

            this.awaitingAction = null;
            this.understoodButton.setAlpha(1);
        }
    }

    createSecondRegion() {
        const { width, height } = this.scale;

        // Move first region left
        this.tweens.add({
            targets: this.regionContainer,
            x: width / 2 - 120,
            duration: 500
        });

        // Create second region
        this.secondRegion = this.add.container(width / 2 + 120, height / 2 - 40);
        this.secondRegionRt = 1.12;

        const pulseCircle2 = this.add.circle(0, 0, 80, 0x00ffff, 0.1);
        this.secondRegionCircle = this.add.circle(0, 0, 60, 0xf97316, 0.3)
            .setStrokeStyle(3, 0xf97316);

        this.secondRtText = this.add.text(0, 0, '1.12', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const rtLabel2 = this.add.text(0, 35, 'Rₜ', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        this.secondRegion.add([pulseCircle2, this.secondRegionCircle, this.secondRtText, rtLabel2]);
        this.secondRegion.setAlpha(0);

        this.tweens.add({
            targets: this.secondRegion,
            alpha: 1,
            duration: 500,
            delay: 300
        });
    }

    showHUDDemo() {
        const { width } = this.scale;

        // Create temporary HUD
        const hudContainer = this.add.container(0, 0);

        const avgRtBg = this.add.rectangle(width / 2, 60, 180, 50, 0x1a1a2e, 0.9)
            .setStrokeStyle(1, 0x00ffff, 0.5);
        const avgRtLabel = this.add.text(width / 2, 45, 'Average Rₜ', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        const avgRtText = this.add.text(width / 2, 70, '1.08', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#f97316',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Progress bar
        const progressBg = this.add.rectangle(width / 2, 105, 160, 12, 0x333333);
        const progressBar = this.add.rectangle(width / 2 - 80, 105, 0, 10, 0x00ffff).setOrigin(0, 0.5);

        hudContainer.add([avgRtBg, avgRtLabel, avgRtText, progressBg, progressBar]);
        hudContainer.setAlpha(0);

        // Fade in
        this.tweens.add({
            targets: hudContainer,
            alpha: 1,
            duration: 500
        });

        // Animate average Rt dropping and progress bar filling
        this.time.delayedCall(1000, () => {
            this.tweens.addCounter({
                from: 1.08,
                to: 0.98,
                duration: 2000,
                onUpdate: (tween) => {
                    const val = tween.getValue();
                    avgRtText.setText(val.toFixed(2));
                    avgRtText.setColor(val < 1 ? '#22c55e' : '#f97316');
                }
            });

            this.tweens.add({
                targets: progressBar,
                width: 160,
                duration: 3000,
                delay: 1500
            });
        });
    }

    showRebound() {
        // Reset region to show rebound effect
        const config = GAME_CONFIG.interventions.mask;

        // First show intervention ending
        this.regionCircle.setStrokeStyle(3, 0x22c55e);
        this.regionCircle.setFillStyle(0x22c55e, 0.3);

        this.time.delayedCall(500, () => {
            // Show Rt rising slowly (rebound)
            this.tweens.addCounter({
                from: 0.95,
                to: 1.00,
                duration: config.reboundDuration * 500, // Speed up for demo
                onUpdate: (tween) => {
                    this.regionRt = tween.getValue();
                    // Add red pulse
                    if (this.regionRt > 0.97) {
                        this.regionCircle.setStrokeStyle(3, 0xef4444, 0.5 + Math.sin(this.time.now / 200) * 0.3);
                    }
                }
            });
        });
    }

    showTransition() {
        const { width, height } = this.scale;

        // Hide training elements
        this.regionContainer.setAlpha(0);
        if (this.secondRegion) this.secondRegion.setAlpha(0);
        this.interventionContainer.setAlpha(0);
        this.dialogueContainer.setAlpha(0);
        this.understoodButton.setAlpha(0);
        this.skipButton.setAlpha(0);

        // Show transition text
        const transitionTexts = [
            { text: 'Training complete.', y: height * 0.3, delay: 0 },
            { text: 'This is the live system. All rules still apply.', y: height * 0.4, delay: 800 },
            { text: 'Stabilize transmission before time runs out.', y: height * 0.5, delay: 1600 }
        ];

        transitionTexts.forEach(({ text, y, delay }) => {
            const textObj = this.add.text(width / 2, y, text, {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#00ffff',
                align: 'center'
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: textObj,
                alpha: 1,
                duration: 600,
                delay: delay
            });
        });

        // Begin button
        this.time.delayedCall(2400, () => {
            const startBtn = this.createButton(width / 2, height * 0.7, '▶ Begin Live Response Level 1', 280, 50, () => {
                // this.sound.play('click');
                this.scene.start('GameScene');
            });
            startBtn.setAlpha(0);
            this.tweens.add({
                targets: startBtn,
                alpha: 1,
                duration: 500
            });
        });
    }

    updateRegionVisuals() {
        const color = getRtColor(this.regionRt);
        this.regionCircle.setStrokeStyle(3, color);
        this.regionCircle.setFillStyle(color, 0.3);
        this.rtText.setText(this.regionRt.toFixed(2));
    }

    update(time, delta) {
        // Update region visuals
        this.updateRegionVisuals();

        // Animate pulse
        if (this.pulseSpeed > 0) {
            this.pulseScale = 1 + Math.sin(time / (1000 / this.pulseSpeed)) * 0.15 * this.pulseSpeed;
            this.pulseCircle.setScale(this.pulseScale);
            this.pulseCircle.setAlpha(0.1 + this.pulseSpeed * 0.05);
        }
    }
}

// ============================================================================
// GAME SCENE - Main gameplay
// ============================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Dark background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

        // Hide fancy background UI and pause it
        const bgUI = document.getElementById('background-ui');
        if (bgUI) bgUI.style.display = 'none';
        pauseBackground();

        this.createGridOverlay();
        // this.createWaveforms(); // Removed as per instruction

        // Game state
        this.gameTime = GAME_CONFIG.game.duration;
        this.isGameOver = false;
        this.isPaused = false;

        // Win condition tracking
        this.timeUnderTarget = 0;
        this.hasWon = false;

        // Intervention cooldowns (per type)
        this.cooldowns = {
            mask: 0,
            vaccine: 0,
            lockdown: 0
        };

        // Selected intervention
        this.selectedIntervention = null;

        // Stats tracking
        this.stats = {
            maskUsed: 0,
            vaccineUsed: 0,
            lockdownUsed: 0,
            longestUnder1: 0
        };

        // Create regions
        this.createRegions();

        // Create HUD
        this.createHUD();

        // Create intervention buttons
        this.createInterventionButtons();

        // Start game loop
        this.gameStartTime = this.time.now;
    }

    createGridOverlay() {
        const { width, height } = this.scale;
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00ffff, 0.05);

        const gridSize = 40;
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        graphics.strokePath();
    }

    createRegions() {
        const { width, height } = this.scale;

        this.regions = [];
        const regionCount = GAME_CONFIG.level1.regionCount;

        // Arrange in 2 rows of 3
        const cols = 3;
        const rows = 2;
        const spacingX = (width - 160) / cols;
        const spacingY = 140;
        const startX = 80 + spacingX / 2;
        const startY = 150;

        for (let i = 0; i < regionCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            // Random initial Rt between 0.98 and 1.05
            const rt = GAME_CONFIG.level1.initialRtMin +
                Math.random() * (GAME_CONFIG.level1.initialRtMax - GAME_CONFIG.level1.initialRtMin);

            const region = this.createRegion(x, y, i, rt);
            this.regions.push(region);
        }
    }

    createRegion(x, y, index, initialRt) {
        const container = this.add.container(x, y);

        // Pulse circle
        const pulseCircle = this.add.circle(0, 0, 55, 0x00ffff, 0.1);

        // Main circle
        const color = getRtColor(initialRt);
        const mainCircle = this.add.circle(0, 0, 45, color, 0.3)
            .setStrokeStyle(3, color);

        // Rt display
        const rtText = this.add.text(0, -5, initialRt.toFixed(2), {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Region label
        const label = this.add.text(0, 22, `R${index + 1}`, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#888888'
        }).setOrigin(0.5);

        // Lock icon (hidden initially)
        const lockIcon = this.add.text(0, -30, '🔒', {
            fontSize: '16px'
        }).setOrigin(0.5).setAlpha(0);

        // Deployment progress ring
        const deployRing = this.add.graphics();

        container.add([pulseCircle, mainCircle, rtText, label, lockIcon, deployRing]);

        // Make interactive
        mainCircle.setInteractive({ useHandCursor: true });
        mainCircle.on('pointerdown', () => {
            this.onRegionClick(index);
        });

        const region = {
            container,
            pulseCircle,
            mainCircle,
            rtText,
            lockIcon,
            deployRing,
            index,
            rt: initialRt,
            baseRt: initialRt,
            // Intervention state
            activeIntervention: null,
            interventionTimeRemaining: 0,
            isDeploying: false,
            deployTimeRemaining: 0,
            // Rebound state
            isRebounding: false,
            reboundRemaining: 0,
            reboundAmount: 0
        };

        return region;
    }

    createHUD() {
        const { width } = this.scale;

        // Average Rt display (top center)
        this.avgRtBg = this.add.rectangle(width / 2, 40, 180, 60, 0x1a1a2e, 0.9)
            .setStrokeStyle(1, 0x00ffff, 0.5);

        this.avgRtLabel = this.add.text(width / 2, 22, 'Average Rₜ', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        this.avgRtText = this.add.text(width / 2, 48, '1.00', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Win progress bar
        this.progressBg = this.add.rectangle(width / 2, 78, 160, 8, 0x333333);
        this.progressBar = this.add.rectangle(width / 2 - 80, 78, 0, 6, 0x00ffff).setOrigin(0, 0.5);
        this.progressLabel = this.add.text(width / 2, 92, 'Sustain < 1 for 8s', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#666666'
        }).setOrigin(0.5);

        // Timer (top right)
        this.timerBg = this.add.rectangle(width - 70, 40, 100, 50, 0x1a1a2e, 0.9)
            .setStrokeStyle(1, 0x00ffff, 0.5);

        this.timerText = this.add.text(width - 70, 40, '1:00', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    createInterventionButtons() {
        const { width, height } = this.scale;

        const buttonY = height - 50;
        const buttonSpacing = 180;
        const startX = width / 2 - buttonSpacing;

        const interventionTypes = ['mask', 'vaccine', 'lockdown'];
        const labels = ['🟦 Mask Mandate', '🟩 Vaccine Push', '🟥 Lockdown'];

        this.interventionBtns = {};

        interventionTypes.forEach((type, i) => {
            const x = startX + i * buttonSpacing;
            const config = GAME_CONFIG.interventions[type];

            const container = this.add.container(x, buttonY);

            // Button background
            const bg = this.add.rectangle(0, 0, 150, 50, config.color, 0.3)
                .setStrokeStyle(2, config.color);

            // Button text
            const text = this.add.text(0, -5, labels[i], {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#ffffff'
            }).setOrigin(0.5);

            // Cooldown text
            const cooldownText = this.add.text(0, 15, '', {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#ffff00'
            }).setOrigin(0.5);

            // Cooldown overlay
            const cooldownOverlay = this.add.rectangle(0, 0, 150, 50, 0x000000, 0.6).setAlpha(0);

            container.add([bg, text, cooldownText, cooldownOverlay]);
            container.setSize(150, 50);
            container.setInteractive({ useHandCursor: true });

            container.on('pointerdown', () => {
                this.selectIntervention(type);
            });

            this.interventionBtns[type] = {
                container,
                bg,
                text,
                cooldownText,
                cooldownOverlay,
                type
            };
        });
    }

    selectIntervention(type) {
        if (this.isGameOver) return;
        if (this.cooldowns[type] > 0) return;

        // Play click sound
        // this.sound.play('click');

        // Toggle selection
        if (this.selectedIntervention === type) {
            this.selectedIntervention = null;
        } else {
            this.selectedIntervention = type;
        }

        // Update button visuals
        Object.entries(this.interventionBtns).forEach(([t, btn]) => {
            const config = GAME_CONFIG.interventions[t];
            if (t === this.selectedIntervention) {
                btn.bg.setFillStyle(config.color, 0.6);
                btn.bg.setStrokeStyle(3, 0xffffff);
            } else {
                btn.bg.setFillStyle(config.color, 0.3);
                btn.bg.setStrokeStyle(2, config.color);
            }
        });
    }

    onRegionClick(index) {
        if (this.isGameOver) return;
        if (!this.selectedIntervention) return;

        const region = this.regions[index];

        // Check if region already has an active intervention
        if (region.activeIntervention || region.isDeploying) return;

        // Check cooldown
        if (this.cooldowns[this.selectedIntervention] > 0) return;

        // Play click sound
        // this.sound.play('click');

        // Apply intervention
        this.applyIntervention(region, this.selectedIntervention);

        // Track stats
        if (this.selectedIntervention === 'mask') this.stats.maskUsed++;
        if (this.selectedIntervention === 'vaccine') this.stats.vaccineUsed++;
        if (this.selectedIntervention === 'lockdown') this.stats.lockdownUsed++;

        // Start cooldown for this intervention type
        const config = GAME_CONFIG.interventions[this.selectedIntervention];
        this.cooldowns[this.selectedIntervention] = config.cooldown;

        // Deselect
        this.selectedIntervention = null;
        this.updateButtonVisuals();
    }

    applyIntervention(region, type) {
        const config = GAME_CONFIG.interventions[type];

        // Start deployment
        region.isDeploying = true;
        region.deployTimeRemaining = config.deployDelay;
        region.pendingIntervention = type;

        // Visual feedback
        region.lockIcon.setAlpha(0.5);
        region.mainCircle.setStrokeStyle(3, config.color);
    }

    activateIntervention(region) {
        const type = region.pendingIntervention;
        const config = GAME_CONFIG.interventions[type];

        region.isDeploying = false;
        region.activeIntervention = type;
        region.interventionTimeRemaining = config.activeDuration;

        // Apply Rt reduction
        region.baseRt = region.rt;
        region.rt = Math.max(0.5, region.rt - config.rtReduction);

        // Visual feedback
        region.lockIcon.setAlpha(1);
        region.mainCircle.setFillStyle(config.color, 0.5);
    }

    endIntervention(region) {
        const type = region.activeIntervention;
        const config = GAME_CONFIG.interventions[type];

        region.activeIntervention = null;
        region.interventionTimeRemaining = 0;

        // Start rebound
        region.isRebounding = true;
        region.reboundRemaining = config.reboundDuration;
        region.reboundAmount = config.rebound;
        region.reboundPerSecond = config.rebound / config.reboundDuration;

        // Visual feedback
        region.lockIcon.setAlpha(0);
    }

    updateButtonVisuals() {
        Object.entries(this.interventionBtns).forEach(([type, btn]) => {
            const config = GAME_CONFIG.interventions[type];
            const cooldown = this.cooldowns[type];

            if (cooldown > 0) {
                btn.cooldownOverlay.setAlpha(0.6);
                btn.cooldownText.setText(`${cooldown.toFixed(1)}s`);
            } else {
                btn.cooldownOverlay.setAlpha(0);
                btn.cooldownText.setText('');
            }

            if (type === this.selectedIntervention) {
                btn.bg.setFillStyle(config.color, 0.6);
                btn.bg.setStrokeStyle(3, 0xffffff);
            } else {
                btn.bg.setFillStyle(config.color, 0.3);
                btn.bg.setStrokeStyle(2, config.color);
            }
        });
    }

    calculateAverageRt() {
        let total = 0;
        this.regions.forEach(r => total += r.rt);
        return total / this.regions.length;
    }

    countRegionsAboveThreshold(threshold) {
        return this.regions.filter(r => r.rt > threshold).length;
    }

    update(time, delta) {
        if (this.isGameOver || this.isPaused) return;

        const dt = delta / 1000;

        // Update game timer
        this.gameTime -= dt;
        if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.endGame(false);
            return;
        }

        // Update timer display
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);

        // Timer color based on time remaining
        if (this.gameTime < 10) {
            this.timerText.setColor('#ef4444');
        } else if (this.gameTime < 20) {
            this.timerText.setColor('#f97316');
        }

        // Update cooldowns
        Object.keys(this.cooldowns).forEach(type => {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] = Math.max(0, this.cooldowns[type] - dt);
            }
        });
        this.updateButtonVisuals();

        // Calculate current average Rt
        const avgRt = this.calculateAverageRt();

        // Determine drift rate
        const regionsAbove12 = this.countRegionsAboveThreshold(GAME_CONFIG.drift.escalationRt);
        let driftRate = GAME_CONFIG.drift.baseline;

        if (regionsAbove12 >= GAME_CONFIG.drift.escalationThreshold) {
            driftRate = GAME_CONFIG.drift.escalated;
        }

        // Pause drift when average Rt < 1
        if (avgRt >= 1.0) {
            // Apply drift to all regions
            this.regions.forEach(region => {
                if (!region.activeIntervention && !region.isDeploying) {
                    region.rt += driftRate * dt;
                }
            });
        }

        // Update regions
        this.regions.forEach(region => {
            // Update deployment
            if (region.isDeploying) {
                region.deployTimeRemaining -= dt;
                if (region.deployTimeRemaining <= 0) {
                    this.activateIntervention(region);
                }
            }

            // Update active intervention
            if (region.activeIntervention) {
                region.interventionTimeRemaining -= dt;
                if (region.interventionTimeRemaining <= 0) {
                    this.endIntervention(region);
                }
            }

            // Update rebound
            if (region.isRebounding) {
                region.rt += region.reboundPerSecond * dt;
                region.reboundRemaining -= dt;
                if (region.reboundRemaining <= 0) {
                    region.isRebounding = false;
                }
            }

            // Clamp Rt
            region.rt = Math.max(0.5, Math.min(2.5, region.rt));

            // Update visuals
            this.updateRegionVisuals(region, time);
        });

        // Update HUD
        this.updateHUD(avgRt, dt);

        // Check win condition
        if (avgRt < GAME_CONFIG.win.targetRt) {
            this.timeUnderTarget += dt;

            // Track longest time under 1
            if (this.timeUnderTarget > this.stats.longestUnder1) {
                this.stats.longestUnder1 = this.timeUnderTarget;
            }

            if (this.timeUnderTarget >= GAME_CONFIG.win.sustainDuration) {
                this.endGame(true);
            }
        } else {
            this.timeUnderTarget = 0;
        }
    }

    updateRegionVisuals(region, time) {
        const color = getRtColor(region.rt);

        // Update colors (unless intervention is active)
        if (!region.activeIntervention && !region.isDeploying) {
            region.mainCircle.setStrokeStyle(3, color);
            region.mainCircle.setFillStyle(color, 0.3);
        }

        // Update Rt text
        region.rtText.setText(region.rt.toFixed(2));

        // Pulse animation based on Rt
        const pulseIntensity = Math.max(0, (region.rt - 0.9)) * 2;
        const pulseScale = 1 + Math.sin(time / (200 / Math.max(0.5, pulseIntensity))) * 0.1 * pulseIntensity;
        region.pulseCircle.setScale(pulseScale);
        region.pulseCircle.setAlpha(0.05 + pulseIntensity * 0.1);
        region.pulseCircle.setFillStyle(color, 0.1);

        // Draw deployment progress ring
        region.deployRing.clear();
        if (region.isDeploying) {
            const config = GAME_CONFIG.interventions[region.pendingIntervention];
            const progress = 1 - (region.deployTimeRemaining / config.deployDelay);

            region.deployRing.lineStyle(4, config.color, 0.8);
            region.deployRing.beginPath();
            region.deployRing.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
            region.deployRing.strokePath();
        }
    }

    updateHUD(avgRt, dt) {
        // Update average Rt display
        this.avgRtText.setText(avgRt.toFixed(2));

        if (avgRt < 1.0) {
            this.avgRtText.setColor('#22c55e');
        } else if (avgRt < 1.1) {
            this.avgRtText.setColor('#eab308');
        } else {
            this.avgRtText.setColor('#ef4444');
        }

        // Update progress bar
        const progressWidth = (this.timeUnderTarget / GAME_CONFIG.win.sustainDuration) * 160;
        this.progressBar.width = Math.min(160, progressWidth);

        if (this.timeUnderTarget > 0) {
            this.progressBar.setFillStyle(0x22c55e);
            this.progressLabel.setText(`${this.timeUnderTarget.toFixed(1)}s / 8s`);
            this.progressLabel.setColor('#22c55e');
        } else {
            this.progressBar.setFillStyle(0x00ffff);
            this.progressLabel.setText('Sustain < 1 for 8s');
            this.progressLabel.setColor('#666666');
        }
    }

    endGame(won) {
        this.isGameOver = true;
        this.hasWon = won;

        // Pass stats to end scene
        this.scene.start('EndScene', {
            won: won,
            stats: this.stats
        });
    }
}

// ============================================================================
// END SCENE
// ============================================================================
class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

    init(data) {
        this.won = data.won;
        this.stats = data.stats || {
            longestUnder1: 0,
            maskUsed: 0,
            vaccineUsed: 0,
            lockdownUsed: 0
        };
    }

    create() {
        const { width, height } = this.scale;

        // Dark background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

        // Hide fancy background UI and pause it
        const bgUI = document.getElementById('background-ui');
        if (bgUI) bgUI.style.display = 'none';
        pauseBackground();

        this.createGridOverlay();

        // Headline
        const headlines = this.won ?
            ['You bought time.', 'Transmission slowed.', 'Control is working but fragile.'] :
            ['Time ran out.', 'The wave won.', 'Try again.'];
        const headline = headlines[Math.floor(Math.random() * headlines.length)];

        const headlineColor = this.won ? '#22c55e' : '#ef4444';

        this.add.text(width / 2, height * 0.2, headline, {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: headlineColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Stats
        const statsY = height * 0.35;
        const statSpacing = 35;

        const statsData = [
            { label: 'Longest Avg Rₜ < 1', value: `${this.stats.longestUnder1.toFixed(1)}s` },
            { label: 'Mask mandates used', value: this.stats.maskUsed.toString() },
            { label: 'Vaccine pushes used', value: this.stats.vaccineUsed.toString() },
            { label: 'Lockdowns triggered', value: this.stats.lockdownUsed.toString() }
        ];

        statsData.forEach((stat, i) => {
            this.add.text(width / 2 - 120, statsY + i * statSpacing, stat.label, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#aaaaaa'
            });

            this.add.text(width / 2 + 120, statsY + i * statSpacing, stat.value, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(1, 0);
        });

        // Retry button
        const retryBtn = this.createButton(width / 2, height * 0.65, '▶ Retry', 160, 50, () => {
            // this.sound.play('click');
            this.scene.start('GameScene');
        });

        // Other levels text
        this.add.text(width / 2, height * 0.78, 'Other levels coming soon', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#666666'
        }).setOrigin(0.5);

        // Back to menu
        this.createButton(width / 2, height * 0.88, 'Main Menu', 140, 40, () => {
            // this.sound.play('click');
            this.scene.start('WelcomeScene');
        });
    }

    createGridOverlay() {
        const { width, height } = this.scale;
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00ffff, 0.05);

        const gridSize = 40;
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        graphics.strokePath();
    }

    createButton(x, y, label, w, h, callback) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, w, h, 0x00ffff, 0.2)
            .setStrokeStyle(2, 0x00ffff);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#00ffff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => bg.setFillStyle(0x00ffff, 0.4));
        container.on('pointerout', () => bg.setFillStyle(0x00ffff, 0.2));
        container.on('pointerdown', callback);

        return container;
    }
}

// ============================================================================
// GAME CONFIGURATION
// ============================================================================
const config = {
    type: Phaser.AUTO,
    parent: 'app',
    scale: {
        mode: Phaser.Scale.FIT,
        width: 800,
        height: 600,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    transparent: true,
    scene: [BootScene, WelcomeScene, TrainingScene, GameScene, EndScene]
};

export const game = new Phaser.Game(config);
