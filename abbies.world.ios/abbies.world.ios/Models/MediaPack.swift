//
//  MediaPack.swift
//  abbies.world.ios
//
//  Classic (server) vs Spooky (bundled Halloween) world skins.
//

import SwiftUI

enum MediaPack: String, CaseIterable, Identifiable, Hashable {
    case classic
    case halloween
    case animalAvenue

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .classic: return "Normal"
        case .halloween: return "Spooky"
        case .animalAvenue: return "Animal Avenue"
        }
    }

    var kidLabel: String {
        switch self {
        case .classic: return "Everyday"
        case .halloween: return "Halloween"
        case .animalAvenue: return "Animals"
        }
    }

    var symbolName: String {
        switch self {
        case .classic: return "sun.max.fill"
        case .halloween: return "theatermasks.fill"
        case .animalAvenue: return "pawprint.fill"
        }
    }

    var usesFourCarousels: Bool {
        self != .classic
    }

    var friendRowTitle: String {
        switch self {
        case .classic: return "Friend"
        case .halloween: return "Monster"
        case .animalAvenue: return "Animal"
        }
    }

    var outfitRowTitle: String {
        self == .halloween ? "Costume" : "Outfit"
    }

    var placeRowTitle: String {
        switch self {
        case .classic: return "Place"
        case .halloween: return "Haunt"
        case .animalAvenue: return "Neighborhood"
        }
    }

    var styleRowTitle: String {
        switch self {
        case .classic: return "Style"
        case .halloween: return "Spooky Style"
        case .animalAvenue: return "Art Style"
        }
    }

    var usesBundledPrompt: Bool {
        self != .classic
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

enum AnimalAvenueCatalog {
    static let bundleRoot = "MediaPacks/Animals"

    static let animals: [MediaPackItem] = [
        item("red_panda", "Red Panda", "animals", "character_style",
             "a cheerful red panda with a fluffy striped tail, warm orange fur, and a curious smile"),
        item("elephant_calf", "Elephant Calf", "animals", "character_style",
             "a gentle gray elephant calf with big pink-lined ears and a playfully curled trunk"),
        item("emperor_penguin", "Emperor Penguin", "animals", "character_style",
             "a round emperor penguin with a glossy black coat, cream belly, and tiny orange feet"),
        item("giraffe_calf", "Giraffe Calf", "animals", "character_style",
             "a lanky giraffe calf with golden spots, small ossicones, and a friendly face"),
        item("capybara", "Capybara", "animals", "character_style",
             "a calm cinnamon-brown capybara with tiny round ears and a contented smile"),
        item("sea_otter", "Sea Otter", "animals", "character_style",
             "a playful sea otter with soft brown fur, bright whiskers, and waving paws"),
        item("axolotl", "Axolotl", "animals", "character_style",
             "a smiling pink axolotl with feathery coral gills and a gently curled tail"),
        item("chameleon", "Chameleon", "animals", "character_style",
             "a bright green chameleon with a spiral tail, bumpy scales, and curious swiveling eyes"),
        item("bumblebee", "Bumblebee", "animals", "character_style",
             "a round fuzzy bumblebee with golden stripes, tiny wings, and friendly antennae"),
        item("giant_pacific_octopus", "Pacific Octopus", "animals", "character_style",
             "a friendly purple giant Pacific octopus with eight curly arms and a warm smile")
    ]

    static let outfits: [MediaPackItem] = [
        item("rainbow_raincoat", "Rainbow Raincoat", "outfits", "color_palette",
             "wearing a bright rainbow raincoat with mismatched colorful rain boots"),
        item("sunflower_overalls", "Sunflower Overalls", "outfits", "color_palette",
             "wearing blue denim overalls covered with sunny yellow sunflower patches"),
        item("starry_pajamas", "Starry Pajamas", "outfits", "color_palette",
             "wearing cozy navy pajamas sprinkled with tiny white and yellow stars"),
        item("junior_chef", "Junior Chef", "outfits", "color_palette",
             "wearing a soft white chef hat and a simple cream cooking apron"),
        item("towel_superhero_cape", "Towel Hero Cape", "outfits", "color_palette",
             "wearing a playful red towel superhero cape tied in a safe loose bow"),
        item("bubble_astronaut", "Bubble Astronaut", "outfits", "color_palette",
             "wearing a rounded white astronaut suit with a glossy bubble helmet and colorful buttons"),
        item("neighborhood_soccer", "Soccer Kit", "outfits", "color_palette",
             "wearing a rainbow-striped neighborhood soccer jersey, navy shorts, socks, and sneakers"),
        item("polkadot_tutu", "Polka-Dot Tutu", "outfits", "color_palette",
             "wearing a fluffy yellow tutu covered in cheerful rainbow polka dots"),
        item("cozy_hoodie_backpack", "Hoodie & Backpack", "outfits", "color_palette",
             "wearing a cozy teal hoodie with a small sunflower-yellow backpack"),
        item("friendly_firefighter", "Firefighter Gear", "outfits", "color_palette",
             "wearing friendly red firefighter gear with yellow safety stripes, helmet, and boots")
    ]

    static let places: [MediaPackItem] = [
        item("corner_bakery", "Corner Bakery", "places", "world_setting",
             "at a colorful neighborhood corner bakery with cupcakes, striped awnings, and flower pots"),
        item("treehouse_library", "Treehouse Library", "places", "world_setting",
             "inside a leafy treehouse library filled with picture books and cozy reading nooks"),
        item("pocket_park_playground", "Pocket-Park Playground", "places", "world_setting",
             "at a sunny pocket-park playground with a slide, swings, seesaw, and shady trees"),
        item("community_garden", "Community Garden", "places", "world_setting",
             "in a blooming community garden full of sunflowers, vegetables, watering cans, and butterflies"),
        item("neighborhood_firehouse", "Neighborhood Firehouse", "places", "world_setting",
             "at a welcoming red neighborhood firehouse with open garage doors and a tiny fire truck"),
        item("saturday_street_market", "Saturday Street Market", "places", "world_setting",
             "at a bustling Saturday street market with striped stalls, fruit baskets, and friendly neighbors"),
        item("rainbow_splash_pad", "Rainbow Splash Pad", "places", "world_setting",
             "at a rainbow splash pad with colorful fountains, sparkling puddles, and sunny trees"),
        item("school_bus_stop", "School Bus Stop", "places", "world_setting",
             "at a friendly neighborhood bus stop beside a bright yellow school bus and leafy sidewalk"),
        item("community_art_studio", "Community Art Studio", "places", "world_setting",
             "inside a joyful community art studio with easels, paint splashes, brushes, and craft tables"),
        item("animal_avenue_block_party", "Animal Avenue Party", "places", "world_setting",
             "at a crowded Animal Avenue block party with bunting, balloons, music, dancing, and many animal neighbors")
    ]

    static let styles: [MediaPackItem] = [
        item("sunny_storybook", "Sunny Storybook", "styles", "art_style",
             "polished sunny storybook gouache, thick dark-indigo outlines, soft painted texture, rounded shapes, and cheerful neighborhood colors"),
        item("crayon_club", "Crayon Club", "styles", "art_style",
             "chunky wax-crayon drawing on warm paper, visible colorful strokes, wobbly friendly outlines, and childlike energy"),
        item("paper_collage", "Paper Collage", "styles", "art_style",
             "layered cut-paper collage with torn edges, softly raised paper shadows, simple shapes, and tactile craft-table charm"),
        item("sidewalk_chalk", "Sidewalk Chalk", "styles", "art_style",
             "vivid sidewalk-chalk art on deep navy pavement, dusty edges, broad hand-drawn marks, and bright playful color"),
        item("cozy_felt", "Cozy Felt", "styles", "art_style",
             "handmade felt appliqué with soft fuzzy fibers, rounded sewn edges, tiny stitches, and warm cozy colors"),
        item("bubble_paint", "Bubble Paint", "styles", "art_style",
             "bubbly translucent watercolor paint, soft overlapping washes, rounded splashes, bright highlights, and airy white paper"),
        item("picture_book_ink", "Picture-Book Ink", "styles", "art_style",
             "expressive picture-book pen-and-ink lines with loose light watercolor washes, lively marks, and lots of warmth"),
        item("sticker_sparkle", "Sticker Sparkle", "styles", "art_style",
             "glossy die-cut sticker art, bold clean outline, bright flat colors, tiny harmless sparkles, and crisp playful shapes"),
        item("patchwork_quilt", "Patchwork Quilt", "styles", "art_style",
             "fabric patchwork quilt illustration with cotton textures, stitched seams, appliqué shapes, and a cozy handmade palette"),
        item("bedtime_glow", "Bedtime Glow", "styles", "art_style",
             "gentle moonlit bedtime picture-book art in blue and lavender with warm window lights, soft stars, and a calm magical glow")
    ]

    static let backgroundFileStem = "animal_avenue_background"

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
            id: "animal_\(folder.dropLast())_\(stem)",
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
