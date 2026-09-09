//
//  MediaPack.swift
//  abbies.world.ios
//
//  Classic (server) vs Spooky (bundled Halloween) world skins.
//

import SwiftUI

enum MediaPack: String, CaseIterable, Identifiable {
    case classic
    case halloween

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .classic: return "Normal"
        case .halloween: return "Spooky"
        }
    }

    var kidLabel: String {
        switch self {
        case .classic: return "Everyday"
        case .halloween: return "Halloween"
        }
    }

    var symbolName: String {
        switch self {
        case .classic: return "sun.max.fill"
        case .halloween: return "theatermasks.fill"
        }
    }

    var usesFourCarousels: Bool {
        self == .halloween
    }

    var friendRowTitle: String {
        self == .halloween ? "Monster" : "Friend"
    }

    var outfitRowTitle: String {
        self == .halloween ? "Costume" : "Outfit"
    }

    var placeRowTitle: String {
        self == .halloween ? "Haunt" : "Place"
    }

    var styleRowTitle: String {
        self == .halloween ? "Spooky Style" : "Style"
    }
}

struct MediaPackItem: Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let styleInjection: String
    let bundleSubdirectory: String
    let fileStem: String

    var bundleImageName: String {
        "\(bundleSubdirectory)/\(fileStem)"
    }

    func asIngredient() -> Ingredient {
        Ingredient(
            id: id,
            name: name,
            category: category,
            styleInjection: styleInjection,
            imageURL: nil,
            imageName: bundleImageName
        )
    }
}

enum HalloweenCatalog {
    static let bundleRoot = "MediaPacks/Halloween"

    static let monsters: [MediaPackItem] = [
        item("boo_blob", "Boo Blob", "monsters", "character_style",
             "a round purple ghost blob with one goofy front tooth, waving both stubby arms"),
        item("count_snackula", "Count Snackula", "monsters", "character_style",
             "a tiny friendly vampire kid whose cape is a dangling juice box, with silly plastic fangs"),
        item("witchlet_pip", "Witchlet Pip", "monsters", "character_style",
             "a little kid witch in a hat so big it covers her eyes, peeking out from underneath"),
        item("franky_stitch", "Franky Stitch", "monsters", "character_style",
             "a friendly green monster with comic stitch marks and a zipper for a smile"),
        item("howlbert", "Howlbert", "monsters", "character_style",
             "a fluffy werewolf cub in striped pajamas howling at a tiny nightlight"),
        item("mummy_mallow", "Mummy Mallow", "monsters", "character_style",
             "a marshmallow-soft mummy kid trailing silly toilet paper bandages"),
        item("pumpkin_pal", "Pumpkin Pal", "monsters", "character_style",
             "a walking pumpkin pal with a crooked happy grin and twiggy stick arms"),
        item("skelly_giggles", "Skelly Giggles", "monsters", "character_style",
             "a giggling cartoon skeleton wearing bright sneakers, bones loosely jiggling"),
        item("batty_mcflap", "Batty McFlap", "monsters", "character_style",
             "a chubby purple bat wearing round glasses, wings like tiny capes"),
        item("zom_bean", "Zom-Bean", "monsters", "character_style",
             "a cute jelly-bean zombie with a candy-corn nose and mismatched button eyes")
    ]

    static let outfits: [MediaPackItem] = [
        item("candy_corn_tutu", "Candy Corn Tutu", "outfits", "color_palette",
             "wearing a fluffy candy-corn tutu with yellow, orange, and white layers"),
        item("spiderweb_onesie", "Spiderweb Onesie", "outfits", "color_palette",
             "wearing a cozy white onesie printed with a friendly cartoon spiderweb"),
        item("juicebox_cape", "Juice-Box Cape", "outfits", "color_palette",
             "wearing a bath-towel superhero cape clipped on with a juice box"),
        item("star_raincoat", "Star Raincoat", "outfits", "color_palette",
             "wearing a shiny yellow raincoat covered in purple stars"),
        item("bone_pajamas", "Bone Pajamas", "outfits", "color_palette",
             "wearing glow-in-the-dark skeleton pajamas with silly bones printed on them"),
        item("pumpkin_overalls", "Pumpkin Overalls", "outfits", "color_palette",
             "wearing chunky orange pumpkin overalls with a smiling jack-o'-lantern pocket"),
        item("peekaboo_sheet", "Peekaboo Sheet", "outfits", "color_palette",
             "wearing a white ghost sheet costume with arm holes and a stitched grin"),
        item("monster_slippers", "Monster Slippers", "outfits", "color_palette",
             "wearing huge fuzzy monster-feet slippers with goofy claws"),
        item("bat_bowtie", "Bat Bowtie", "outfits", "color_palette",
             "wearing a tiny bat-wing bowtie on a fancy little vest"),
        item("haunted_hoodie", "Haunted Hoodie", "outfits", "color_palette",
             "wearing a purple hoodie whose hood has two silly glowing eyes")
    ]

    static let places: [MediaPackItem] = [
        item("lollipop_graveyard", "Lollipop Graveyard", "places", "world_setting",
             "standing in a candy graveyard of giant lollipop tombstones under a goofy moon"),
        item("haunted_treehouse", "Haunted Treehouse", "places", "world_setting",
             "in a wooden treehouse with a wobbly ghost flag and string-light spiders"),
        item("moonlit_pumpkin_patch", "Moonlit Pumpkin Patch", "places", "world_setting",
             "in a moonlit pumpkin patch where one pumpkin wears sunglasses"),
        item("gym_halloween_dance", "Gym Halloween Dance", "places", "world_setting",
             "at a school gym Halloween dance with paper bats and slime-green punch"),
        item("bat_cave_playhouse", "Bat Cave Playhouse", "places", "world_setting",
             "inside a blanket-fort bat cave playhouse full of stuffed bats"),
        item("maccheese_cauldron", "Mac & Cheese Cauldron", "places", "world_setting",
             "in a witchy kitchen whose cauldron is bubbling mac and cheese"),
        item("spiderweb_playground", "Spiderweb Playground", "places", "world_setting",
             "on a playground wrapped in cotton-candy spiderwebs"),
        item("glow_library", "Glow Library", "places", "world_setting",
             "in a cozy library glowing with jars of fireflies and floating paper ghosts"),
        item("silly_corn_maze", "Silly Corn Maze", "places", "world_setting",
             "in a foggy corn maze with silly arrow signs pointing in goofy loops"),
        item("underbed_fort", "Under-the-Bed Fort", "places", "world_setting",
             "in a pillow-and-blanket fort under a bed, lit by pumpkin string lights")
    ]

    static let styles: [MediaPackItem] = [
        item("glowstick_scribble", "Glow Stick Scribble", "styles", "art_style",
             "neon glow-stick scribbles on night black, kid-drawn energy, glowing lines"),
        item("candy_wrapper", "Candy Wrapper Collage", "styles", "art_style",
             "collage of crinkly candy wrappers, shiny foil bits, playful mixed-media mess"),
        item("midnight_crayon", "Midnight Crayon", "styles", "art_style",
             "waxy midnight crayon drawing on dark construction paper, bold kid strokes"),
        item("jackolantern_glow", "Jack-o’ Glow", "styles", "art_style",
             "warm jack-o'-lantern glow, orange rim light, cozy Halloween night lighting"),
        item("shadow_puppet", "Shadow Puppets", "styles", "art_style",
             "flashlight shadow-puppet theater, funny silhouettes, warm cone of light"),
        item("spiderweb_lace", "Spiderweb Lace", "styles", "art_style",
             "delicate white spiderweb lace filigree over candy colors"),
        item("bat_stamp", "Bat Stamp", "styles", "art_style",
             "stamped cartoon bats, printmaking ink, repeating playful pattern"),
        item("potion_splash", "Potion Splash", "styles", "art_style",
             "splashy potion watercolor, lime and grape splatters, wet-on-wet"),
        item("halloween_comic", "Halloween Comic", "styles", "art_style",
             "chunky Halloween comic book, bold ink, candy-colored halftone dots"),
        item("flashlight_fog", "Flashlight Fog", "styles", "art_style",
             "foggy flashlight-beam sketch, dusty glow, gentle mystery, not scary")
    ]

    static let backgroundFileStem = "background"

    static func loadBackground() -> UIImage? {
        MediaPackImageLoader.image(subdirectory: bundleRoot, stem: backgroundFileStem)
    }

    private static func item(
        _ stem: String,
        _ name: String,
        _ folder: String,
        _ category: String,
        _ prompt: String
    ) -> MediaPackItem {
        MediaPackItem(
            id: "halloween_\(folder.dropLast())_\(stem)",
            name: name,
            category: category,
            styleInjection: prompt,
            bundleSubdirectory: "\(bundleRoot)/\(folder)",
            fileStem: stem
        )
    }
}

enum MediaPackImageLoader {
    static func image(named bundleImageName: String) -> UIImage? {
        let parts = bundleImageName.split(separator: "/").map(String.init)
        guard let stem = parts.last else { return nil }
        let subdirectory = parts.dropLast().joined(separator: "/")
        return image(subdirectory: subdirectory, stem: stem)
    }

    static func image(subdirectory: String, stem: String) -> UIImage? {
        if let url = Bundle.main.url(forResource: stem, withExtension: "png", subdirectory: subdirectory),
           let image = UIImage(contentsOfFile: url.path) {
            return image
        }
        if let url = Bundle.main.url(forResource: stem, withExtension: "png"),
           let image = UIImage(contentsOfFile: url.path) {
            return image
        }
        return UIImage(named: stem)
    }
}
