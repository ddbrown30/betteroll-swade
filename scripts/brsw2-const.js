
export class BRSW2_CONST {

    static BRSW_CARD_TYPES = {
        TYPE_ATTRIBUTE_CARD: 1,
        TYPE_SKILL_CARD: 2,
        TYPE_ITEM_CARD: 3,
        TYPE_DMG_CARD: 10,
        TYPE_INC_CARD: 11,
        TYPE_INJ_CARD: 12,
        TYPE_UNSHAKE_CARD: 13,
        TYPE_UNSTUN_CARD: 14,
        TYPE_RESULT_CARD: 100,
    };

    static INJURY_BASE = {
        2: "BRSW.Unmentionables",
        3: "BRSW.Arm",
        5: "BRSW.Guts",
        10: "BRSW.Leg",
        12: "BRSW.Head",
    };

    static SECOND_INJURY_TABLES = {
        "BRSW.Guts": {
            1: "BRSW.Broken",
            3: "BRSW.Battered",
            5: "BRSW.Busted",
        },
        "BRSW.Head": {
            1: "BRSW.Scar",
            4: "BRSW.Blinded",
            6: "BRSW.Brain",
        },
    };

    static INJURY_ACTIVE_EFFECT = {
        "BRSW.Guts+BRSW.Broken": {
            changes: [
                { key: "system.attributes.agility.die.sides", mode: 2, value: -2 },
            ],
        },
        "BRSW.Guts+BRSW.Battered": {
            changes: [{ key: "system.attributes.vigor.die.sides", mode: 2, value: -2 }],
        },
        "BRSW.Guts+BRSW.Busted": {
            changes: [
                { key: "system.attributes.strength.die.sides", mode: 2, value: -2 },
            ],
        },
        "BRSW.Head+BRSW.Brain": {
            changes: [
                { key: "system.attributes.smarts.die.sides", mode: 2, value: -2 },
            ],
        },
        "BRSW.Leg+": {
            changes: [
                { key: "system.stats.speed.runningDie", mode: 2, value: -2 },
                { key: "system.stats.speed.value", mode: 2, value: -2 },
            ],
        },
        "BRSW.Head+BRSW.Blinded": {},
        "BRSW.Head+BRSW.Scar": {},
        "BRSW.Arm+": {},
        "BRSW.Unmentionables+": {},
    };

    static ATTRIBUTES = ["agility", "smarts", "spirit", "strength", "vigor"];

    static ARCANE_SKILLS = [
        "faith",
        "focus",
        "spellcasting",
        `glaube`,
        "fokus",
        "zaubern",
        "druidism",
        "elementalism",
        "glamour",
        "heahwisardry",
        "hrimwisardry",
        "solar magic",
        "song magic",
        "soul binding",
        "artificer",
        "astrology",
        "dervish",
        "divination",
        "jinn binding",
        "khem-hekau",
        "mathemagic",
        "sand magic",
        "sha'ir",
        "ship magic",
        "ushabti",
        "wizir magic",
        "word magic",
        "druidenmagie",
        "elementarmagie",
        "heahmagie",
        "hrimmagie",
        "gesangsmagie",
        "psionics",
        "psiónica",
        "psionica",
        "fe",
        "hechicería",
        "hechiceria",
        "foi",
        "magie",
        "science étrange",
        "science etrange",
        "élémentalisme",
        "elementalisme",
        "druidisme",
        "magie solaire",
        "weird science",
        "voidomancy",
    ];

    static FIGHTING_SKILLS = [
        "fighting",
        "kämpfen",
        "pelear",
        "combat",
        "lutar",
        "combattere",
    ];

    static SHOOTING_SKILLS = [
        "shooting",
        "schiessen",
        "disparar",
        "tir",
        "atirar",
        "sparare",
    ];

    static THROWING_SKILLS = [
        "athletics",
        "athletik",
        "atletismo",
        "athletisme",
        "athlétisme",
        "★ athletics",
        "atletica",
    ];

    static UNTRAINED_SKILLS = [
        "untrained",
        "untrainiert",
        "desentrenada",
        "non entraine",
        "non entrainé",
        "unskilled",
        "unskilled attempt",
        "(unskilled)",
    ];

    static ARCANE_MASTERY_EDGES = [
        "BRSW.EdgeName.ArcaneMastery",
        "BRSW.EdgeName.DivineMastery",
        "BRSW.EdgeName.EpicMastery",
        "BRSW.EdgeName.MasterOfMagic",
        "BRSW.EdgeName.MasterPsionics",
    ];

    // Translation map for attributes
    static ATTRIBUTES_TRANSLATION_KEYS = {
        agility: "SWADE.AttrAgi",
        smarts: "SWADE.AttrSma",
        spirit: "SWADE.AttrSpr",
        strength: "SWADE.AttrStr",
        vigor: "SWADE.AttrVig",
    };

    // Translation strings for ranges
    static RANGE_STRINGS = {
        [-2]: "BRSW.RangeMedium",
        [-4]: "BRSW.RangeLong",
        [-8]: "BRSW.RangeExtreme",
    };
}