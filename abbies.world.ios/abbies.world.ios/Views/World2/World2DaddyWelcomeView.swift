//
//  World2DaddyWelcomeView.swift
//  abbies.world.ios
//
//  Inside Daddy's Citadel POI: welcome plate. Every visit hands a candy or
//  pocket hug — then you can stay and look around. The gift pops and flies
//  toward the inventory avatar slot.
//

import SwiftUI

struct World2DaddyWelcomeView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @State private var awarded: World2StoryDecoration?
    @State private var burst = false
    @State private var showWelcomeCard = true
    @State private var giftFlight: CGSize = .zero
    @State private var giftOpacity: Double = 1
    @State private var isArrangingFurniture = false
    @State private var selectedFurnitureID: String?
    @State private var selectedCatalogItemID: String?
    @State private var decorateFilter: DecorateFilterID = .mine
    @State private var showingSceneInvent = false

    private var decorateSurfaceKey: String {
        World2DecorateSurface.key(forPOI: World2POIRegistry.evanHomeID)
    }

    var body: some View {
        GeometryReader { geo in
            let plate = CGRect(origin: .zero, size: geo.size)
            ZStack {
                World2SemanticImage(
                    semanticName: "poi.evanHome.interior",
                    fallbackIcon: "building.2.fill",
                    fallbackLabel: "Daddy's Citadel interior"
                )
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.22),
                        Color.black.opacity(0.40),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)

                World2SceneDecorateLayer(
                    surfaceKey: decorateSurfaceKey,
                    mapRect: plate,
                    isArranging: isArrangingFurniture,
                    selectedFurnitureID: $selectedFurnitureID,
                    selectedCatalogItemID: $selectedCatalogItemID,
                    coordinateSpaceName: "world2.daddyHome"
                )
                .zIndex(8)

                VStack(spacing: 18) {
                    Spacer()
                        .allowsHitTesting(false)

                    if isArrangingFurniture {
                        EmptyView()
                    } else if showWelcomeCard {
                        welcomeCard
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else {
                        Text("Gift tucked in your inventory — stay as long as you like.")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.9))
                            .padding(.horizontal, 18)
                            .padding(.vertical, 12)
                            .background(.ultraThinMaterial, in: Capsule())
                            .padding(.bottom, 28)
                    }
                }
                .zIndex(12)

                if let awarded, burst, !isArrangingFurniture {
                    World2StoryDecorationArtwork(decoration: awarded)
                        .frame(width: 96, height: 96)
                        .scaleEffect(burst ? 1.15 : 0.4)
                        .opacity(giftOpacity)
                        .offset(giftFlight)
                        .position(x: geo.size.width * 0.5, y: geo.size.height * 0.52)
                        .allowsHitTesting(false)
                        .zIndex(80)
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityIdentifier("world2.daddyWelcome")
        .onAppear {
            grantVisitGift()
            if viewModel.daddyHomeDecorateTick > 0 {
                beginDecorating()
            }
        }
        .onChange(of: viewModel.daddyHomeDecorateTick) { _, _ in
            beginDecorating()
        }
        .onChange(of: viewModel.sandboxInventTick) { _, _ in
            showingSceneInvent = true
        }
        .sheet(isPresented: $showingSceneInvent) {
            let scene = World2SceneDefinition(
                id: World2POIRegistry.evanHomeID,
                name: "Daddy's Citadel",
                summary: "Inside Daddy's home",
                backgroundAsset: "poi.evanHome.interior",
                isMutableByPlayer: true
            )
            World2SceneInventDecorationsView(
                scene: scene,
                plateImage: AssetBootstrapService.shared.image(for: "poi.evanHome.interior"),
                onCarved: { viewModel.notifySceneInventReady($0) },
                onOpenDecorate: {
                    showingSceneInvent = false
                    beginDecorating()
                },
                onTravel: { result in
                    showingSceneInvent = false
                    viewModel.reopenInventResult(result)
                },
                onClose: { showingSceneInvent = false }
            )
        }
        .world2InteriorActions(
            [
                World2ThumbAction(
                    id: "decorate",
                    title: "Decorate",
                    icon: "paintbrush.pointed.fill"
                )
            ],
            exitTitle: "Exit",
            exitAccessibilityID: "world2.daddyWelcome.back",
            enabled: !isArrangingFurniture,
            onExit: onExit
        ) { id in
            if id == "decorate" {
                beginDecorating()
            }
        }
        .overlay(alignment: .bottom) {
            if isArrangingFurniture {
                World2DecorateTray(
                    playerName: "Daddy's Citadel",
                    selectedCatalogID: selectedCatalogItemID,
                    selectedInventoryID: selectedFurnitureID,
                    filter: decorateFilter,
                    onFilterChange: { decorateFilter = $0 },
                    onSelectCatalog: { item in
                        selectedCatalogItemID = item.id
                        selectedFurnitureID = nil
                    },
                    onSelectInventory: { id in
                        selectedFurnitureID = id
                        selectedCatalogItemID = nil
                    },
                    onDone: {
                        isArrangingFurniture = false
                        selectedFurnitureID = nil
                        selectedCatalogItemID = nil
                    }
                )
                .zIndex(80)
            }
        }
    }

    private func beginDecorating() {
        showWelcomeCard = false
        decorateFilter = .mine
        isArrangingFurniture = true
    }

    private var welcomeCard: some View {
        VStack(spacing: 14) {
            Text("Welcome to Daddy's World")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .multilineTextAlignment(.center)

            Text("Something sweet is waiting for you.")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.85))

            if let awarded {
                World2StoryDecorationArtwork(decoration: awarded)
                    .frame(width: 72, height: 72)
                    .opacity(giftOpacity > 0.5 ? 0.35 : 1)

                Text("\(awarded.name) is flying to your inventory!")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .multilineTextAlignment(.center)
            } else {
                ProgressView()
                    .tint(.white)
            }

            Button {
                withAnimation(.easeOut(duration: 0.25)) {
                    showWelcomeCard = false
                }
            } label: {
                Label("Stay & look around", systemImage: "eye.fill")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.cyan)
            .accessibilityIdentifier("world2.daddyWelcome.stay")
        }
        .foregroundStyle(.white)
        .padding(24)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28))
        .overlay(
            RoundedRectangle(cornerRadius: 28)
                .stroke(.cyan.opacity(0.55), lineWidth: 2)
        )
        .padding(.horizontal, 28)
        .padding(.bottom, 36)
    }

    private func grantVisitGift() {
        let gift = Bool.random()
            ? World2StoryDecoration.daddyCandy
            : World2StoryDecoration.daddyHug
        _ = viewModel.awardDaddyVisitGift(gift)
        awarded = gift
        viewModel.presentFlyingGift(gift)

        withAnimation(.spring(response: 0.55, dampingFraction: 0.7)) {
            burst = true
        }

        // Pop, then tween toward the left avatar / inventory slot.
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            withAnimation(.easeInOut(duration: 0.85)) {
                giftFlight = CGSize(width: -220, height: -280)
                giftOpacity = 0.15
            }
            try? await Task.sleep(for: .milliseconds(900))
            giftOpacity = 0
            viewModel.clearFlyingGift()
            withAnimation(.easeOut(duration: 0.3)) {
                showWelcomeCard = false
            }
        }

        World2Diagnostics.log(
            "daddy_welcome_gift",
            ["decoration": gift.id]
        )
    }
}
