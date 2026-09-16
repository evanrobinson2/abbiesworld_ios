//
//  World2SceneBuilderView.swift
//  abbies.world.ios
//
//  Interior of The Imagination Atelier — pick scene ingredients, cook a land,
//  collect a property deed when the image is ready.
//

import SwiftUI
import UIKit

struct World2SceneBuilderView: View {
    let onExit: () -> Void
    let onAwardDeed: (World2StoryDecoration) -> Void

    @ObservedObject private var cook = World2SceneCookService.shared
    @State private var recipe = World2SceneBuilderRecipe()
    @State private var selectedSlot: World2SceneBuilderSlot = .place

    private let archetype = World2POIRegistry.sceneBuilder

    var body: some View {
        GeometryReader { geo in
            ZStack {
                World2SemanticImage(
                    semanticName: archetype.interiorAsset ?? "poi.sceneBuilder.interior",
                    fallbackIcon: "map.fill",
                    fallbackLabel: "Scene Builder interior artwork is not bundled"
                )
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
                .ignoresSafeArea()
                .overlay(Color.black.opacity(0.28))

                VStack(spacing: 12) {
                    header
                    previewStage
                    selectorRow
                    optionRow
                    generateRow
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 18)
                .padding(.top, 14)
                .padding(.bottom, 18)

                if cook.activeJob?.phase == .cooking {
                    cookingOverlay
                }

                if cook.activeJob?.phase == .ready {
                    readyOverlay
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneBuilder.interior")
    }

    private var header: some View {
        HStack {
            Button(action: onExit) {
                Label("Leave Atelier", systemImage: "arrow.left")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(.black.opacity(0.72), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.sceneBuilder.exit")

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(archetype.name)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                Text(selectedSlot.promptHint)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 14))
        }
    }

    private var previewStage: some View {
        ZStack {
            if let frame = UIImage(named: "world2_scene_preview_frame") {
                Image(uiImage: frame)
                    .resizable()
                    .scaledToFit()
            } else {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(red: 0.93, green: 0.86, blue: 0.70))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color(red: 0.72, green: 0.55, blue: 0.22), lineWidth: 4)
                    )
            }

            Group {
                if let previewName = cook.activeJob?.previewCatalogName
                    ?? cook.lastReadyJob?.previewCatalogName,
                   let preview = UIImage(named: previewName) {
                    Image(uiImage: preview)
                        .resizable()
                        .scaledToFill()
                } else {
                    Text(recipe.isComplete ? recipe.summaryLine : "Choose every ingredient, then cook a land.")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.35, green: 0.22, blue: 0.12))
                        .multilineTextAlignment(.center)
                        .padding(28)
                }
            }
            .frame(maxWidth: 520, maxHeight: 220)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(36)
        }
        .frame(maxHeight: 260)
        .accessibilityIdentifier("world2.sceneBuilder.preview")
    }

    private var selectorRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(World2SceneBuilderSlot.allCases) { slot in
                    Button {
                        selectedSlot = slot
                    } label: {
                        VStack(spacing: 6) {
                            if let art = UIImage(named: slot.assetCatalogName) {
                                Image(uiImage: art)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 72, height: 72)
                            } else {
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(.orange.opacity(0.35))
                                    .frame(width: 72, height: 72)
                                    .overlay(Text(slot.title).font(.caption.bold()))
                            }
                            Text(slot.title)
                                .font(.system(size: 11, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                            Circle()
                                .fill(isFilled(slot) ? Color.green : Color.white.opacity(0.25))
                                .frame(width: 8, height: 8)
                        }
                        .padding(8)
                        .background(
                            selectedSlot == slot
                                ? Color.white.opacity(0.22)
                                : Color.black.opacity(0.35),
                            in: RoundedRectangle(cornerRadius: 16)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.sceneBuilder.slot.\(slot.rawValue)")
                }
            }
            .padding(.vertical, 4)
        }
    }

    private var optionRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(selectedSlot.options) { option in
                    Button {
                        apply(option, to: selectedSlot)
                    } label: {
                        Text(option.label)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(
                                isSelected(option, in: selectedSlot)
                                    ? Color(red: 0.25, green: 0.14, blue: 0.06)
                                    : .white
                            )
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(
                                isSelected(option, in: selectedSlot)
                                    ? Color(red: 1.0, green: 0.86, blue: 0.45)
                                    : Color.black.opacity(0.55),
                                in: Capsule()
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier(
                        "world2.sceneBuilder.option.\(selectedSlot.rawValue).\(option.id)"
                    )
                }
            }
        }
    }

    private var generateRow: some View {
        Button {
            cook.startCook(recipe: recipe)
        } label: {
            HStack(spacing: 14) {
                if let art = UIImage(named: "world2_generate_scene_button") {
                    Image(uiImage: art)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 64, height: 64)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("COOK A LAND")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                    Text(recipe.isComplete ? "The atelier machinery will start" : "Pick every ingredient first")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .opacity(0.85)
                }
                Spacer()
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                recipe.isComplete && cook.activeJob?.phase != .cooking
                    ? Color(red: 0.78, green: 0.28, blue: 0.35)
                    : Color.gray.opacity(0.55),
                in: RoundedRectangle(cornerRadius: 18)
            )
        }
        .buttonStyle(.plain)
        .disabled(!recipe.isComplete || cook.activeJob?.phase == .cooking)
        .accessibilityIdentifier("world2.sceneBuilder.generate")
    }

    private var cookingOverlay: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea()
            VStack(spacing: 16) {
                if let badge = UIImage(named: "world2_scene_builder_cooking_badge") {
                    Image(uiImage: badge)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 220, height: 220)
                        .accessibilityIdentifier("world2.sceneBuilder.cookingBadge")
                } else {
                    Text("COOKING")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.orange)
                }
                Text("Go play. Come back when the sign says READY.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)

                Button(action: onExit) {
                    Label("Leave Atelier", systemImage: "arrow.left")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(.black.opacity(0.72), in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("world2.sceneBuilder.cookingExit")
            }
        }
        .accessibilityIdentifier("world2.sceneBuilder.cookingOverlay")
    }

    private var readyOverlay: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(spacing: 16) {
                Text("READY!")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)

                if let name = cook.activeJob?.previewCatalogName,
                   let preview = UIImage(named: name) {
                    Image(uiImage: preview)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 420, maxHeight: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(.white.opacity(0.5), lineWidth: 2)
                        )
                }

                if let deed = UIImage(named: "world2_deed_reward") {
                    Image(uiImage: deed)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                }

                Text("Your property deed is ready.")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                HStack(spacing: 12) {
                    Button("Keep Looking") {
                        cook.dismissReady()
                    }
                    .buttonStyle(.bordered)
                    .tint(.white)

                    Button("TAKE THE DEED") {
                        onAwardDeed(World2StoryDecoration.propertyDeed)
                        cook.dismissReady()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.78, green: 0.28, blue: 0.35))
                    .accessibilityIdentifier("world2.sceneBuilder.takeDeed")
                }
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
            .padding(24)
        }
        .accessibilityIdentifier("world2.sceneBuilder.readyOverlay")
    }

    private func isFilled(_ slot: World2SceneBuilderSlot) -> Bool {
        switch slot {
        case .place: return recipe.placeID != nil
        case .theme: return recipe.themeID != nil
        case .atmosphere: return recipe.atmosphereID != nil
        case .specialFeature: return recipe.specialFeatureID != nil
        case .vibe: return recipe.vibeID != nil
        case .hardpoints: return true
        }
    }

    private func isSelected(_ option: World2SceneBuilderOption, in slot: World2SceneBuilderSlot) -> Bool {
        switch slot {
        case .place: return recipe.placeID == option.id
        case .theme: return recipe.themeID == option.id
        case .atmosphere: return recipe.atmosphereID == option.id
        case .specialFeature: return recipe.specialFeatureID == option.id
        case .vibe: return recipe.vibeID == option.id
        case .hardpoints: return recipe.hardpointCount == Int(option.id.replacingOccurrences(of: "hp_", with: ""))
        }
    }

    private func apply(_ option: World2SceneBuilderOption, to slot: World2SceneBuilderSlot) {
        switch slot {
        case .place: recipe.placeID = option.id
        case .theme: recipe.themeID = option.id
        case .atmosphere: recipe.atmosphereID = option.id
        case .specialFeature: recipe.specialFeatureID = option.id
        case .vibe: recipe.vibeID = option.id
        case .hardpoints:
            recipe.hardpointCount = Int(option.id.replacingOccurrences(of: "hp_", with: "")) ?? 2
        }
    }
}

#Preview {
    World2SceneBuilderView(onExit: {}, onAwardDeed: { _ in })
}
