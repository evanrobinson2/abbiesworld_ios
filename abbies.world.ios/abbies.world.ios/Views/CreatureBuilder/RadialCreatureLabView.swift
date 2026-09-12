//
//  RadialCreatureLabView.swift
//  abbies.world.ios
//
//  Concept C 2D fallback: a physical radial lab whose machines are the UI.
//

import OSLog
import SwiftUI

private enum CreatureLab2DDiagnostics {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "abbies.world.ios",
        category: "CreatureLab2D"
    )

    static func emit(_ message: String) {
        print(message)
        logger.notice("\(message, privacy: .public)")
    }
}

private enum RadialLabStation: String, CaseIterable {
    case creature
    case outfit
    case buddy

    var title: String {
        switch self {
        case .creature: return "CREATURE"
        case .outfit: return "OUTFIT"
        case .buddy: return "BUDDY"
        }
    }

    var prompt: String {
        switch self {
        case .creature: return "Choose the shape"
        case .outfit: return "Choose the look"
        case .buddy: return "Choose a friend"
        }
    }

    var symbol: String {
        switch self {
        case .creature: return "pawprint.fill"
        case .outfit: return "tshirt.fill"
        case .buddy: return "heart.fill"
        }
    }

    var accent: Color {
        switch self {
        case .creature: return Color(red: 0.64, green: 0.37, blue: 0.96)
        case .outfit: return Color(red: 0.96, green: 0.50, blue: 0.22)
        case .buddy: return Color(red: 0.30, green: 0.84, blue: 0.64)
        }
    }
}

struct RadialCreatureLabView: View {
    @ObservedObject var viewModel: CreatureBuilderViewModel

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var activeStation: RadialLabStation?
    @State private var creatureIndex = 0
    @State private var outfitIndex = 0
    @State private var buddyIndex = 0
    @State private var leverWobble = false

    var body: some View {
        GeometryReader { geometry in
            let board = boardSize(in: geometry.size)

            ZStack {
                Image("creature_builder_radial_lab")
                    .resizable()
                    .scaledToFill()
                    .blur(radius: 24)
                    .saturation(0.7)
                    .opacity(0.58)
                    .ignoresSafeArea()

                Color(red: 0.08, green: 0.03, blue: 0.16)
                    .opacity(0.42)
                    .ignoresSafeArea()

                ZStack {
                    Image("creature_builder_radial_lab")
                        .resizable()
                        .scaledToFit()
                        .frame(width: board.width, height: board.height)
                        .accessibilityHidden(true)

                    RadialLabEnergyChannels(
                        creatureSelected: viewModel.selectedCreature != nil,
                        outfitSelected: viewModel.selectedOutfit != nil,
                        buddySelected: viewModel.selectedBuddy != nil
                    )

                    station(
                        .creature,
                        ingredients: viewModel.creatures,
                        index: $creatureIndex,
                        selected: viewModel.selectedCreature,
                        board: board
                    )
                    .position(x: board.width * 0.225, y: board.height * 0.525)

                    station(
                        .outfit,
                        ingredients: viewModel.outfits,
                        index: $outfitIndex,
                        selected: viewModel.selectedOutfit,
                        board: board
                    )
                    .position(x: board.width * 0.775, y: board.height * 0.525)

                    station(
                        .buddy,
                        ingredients: viewModel.buddies,
                        index: $buddyIndex,
                        selected: viewModel.selectedBuddy,
                        board: board
                    )
                    .position(x: board.width * 0.50, y: board.height * 0.245)

                    RadialLabReactor(
                        creature: viewModel.selectedCreature,
                        outfit: viewModel.selectedOutfit,
                        buddy: viewModel.selectedBuddy,
                        isCreating: viewModel.isCreating,
                        size: board.width * 0.175
                    )
                    .position(x: board.width * 0.50, y: board.height * 0.535)

                    embellishmentSocket(size: board.width * 0.075)
                        .position(x: board.width * 0.375, y: board.height * 0.805)

                    fabricateLever(size: board.width * 0.12)
                        .position(x: board.width * 0.635, y: board.height * 0.805)

                    statusOverlay
                        .frame(maxWidth: board.width * 0.56)
                        .position(x: board.width * 0.50, y: board.height * 0.935)
                }
                .frame(width: board.width, height: board.height)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .overlay {
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(.white.opacity(0.16), lineWidth: 2)
                }
                .shadow(color: .black.opacity(0.42), radius: 22, y: 10)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onAppear {
            synchronizeBrowseIndices()
            CreatureLab2DDiagnostics.emit(
                "CREATURE_LAB_2D_FALLBACK asset=radial_lab state=ready"
            )
            runAutomatedVerificationIfRequested()
        }
        .onChange(of: viewModel.selectedCreature?.id) { _, newID in
            synchronizeIndex(
                for: newID,
                in: viewModel.creatures,
                target: $creatureIndex
            )
        }
        .onChange(of: viewModel.selectedOutfit?.id) { _, newID in
            synchronizeIndex(
                for: newID,
                in: viewModel.outfits,
                target: $outfitIndex
            )
        }
        .onChange(of: viewModel.selectedBuddy?.id) { _, newID in
            synchronizeIndex(
                for: newID,
                in: viewModel.buddies,
                target: $buddyIndex
            )
        }
    }

    private func station(
        _ station: RadialLabStation,
        ingredients: [CreatureIngredient],
        index: Binding<Int>,
        selected: CreatureIngredient?,
        board: CGSize
    ) -> some View {
        RadialSelectorStation(
            station: station,
            ingredients: ingredients,
            browseIndex: index,
            selectedID: selected?.id,
            isActive: activeStation == station,
            isDimmed: activeStation != nil && activeStation != station,
            width: board.width * (station == .buddy ? 0.22 : 0.235),
            reduceMotion: reduceMotion,
            onFocus: {
                focus(station)
            },
            onBrowse: { ingredient in
                focus(station)
                CreatureLab2DDiagnostics.emit(
                    "CREATURE_LAB_2D_EVENT station=\(station.rawValue) " +
                    "action=browse option=\(ingredient.id)"
                )
            },
            onConfirm: { ingredient in
                confirm(ingredient, at: station)
            }
        )
    }

    private var statusOverlay: some View {
        Group {
            if viewModel.queueFull {
                statusPill(
                    "The machine is busy — your choices are still here.",
                    symbol: "clock.fill",
                    color: .orange
                )
            } else if let error = viewModel.errorMessage {
                statusPill(error, symbol: "sparkles", color: .pink)
            } else if viewModel.canCreate {
                statusPill(
                    "All three energy channels are ready!",
                    symbol: "bolt.fill",
                    color: .mint
                )
            } else {
                statusPill(
                    "Tap a machine, swipe, then tap the center choice.",
                    symbol: "hand.tap.fill",
                    color: .white
                )
            }
        }
    }

    private func statusPill(
        _ text: String,
        symbol: String,
        color: Color
    ) -> some View {
        Label(text, systemImage: symbol)
            .font(.caption.weight(.bold))
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.black.opacity(0.62), in: Capsule())
            .overlay {
                Capsule().stroke(color.opacity(0.5), lineWidth: 1.5)
            }
    }

    private func embellishmentSocket(size: CGFloat) -> some View {
        Button {
            CreatureLab2DDiagnostics.emit(
                "CREATURE_LAB_2D_EVENT socket=embellishment action=dormant_touch"
            )
        } label: {
            TimelineView(.animation) { context in
                let seconds = context.date.timeIntervalSinceReferenceDate
                let wave = reduceMotion ? 0 : sin(seconds * .pi * 0.72)

                ZStack {
                    Circle()
                        .fill(Color(red: 0.10, green: 0.04, blue: 0.16))
                    Circle()
                        .stroke(.purple.opacity(0.65), lineWidth: size * 0.10)
                    Image(systemName: "plus")
                        .font(.system(size: size * 0.30, weight: .black))
                        .foregroundStyle(.purple.opacity(0.72))
                }
                .scaleEffect(1 + wave * 0.018)
            }
        }
        .buttonStyle(.plain)
        .frame(width: size, height: size)
        .accessibilityLabel("Future embellishment socket")
        .accessibilityHint("A curious socket for something coming later")
    }

    private func fabricateLever(size: CGFloat) -> some View {
        Button(action: attemptFabrication) {
            VStack(spacing: 3) {
                ZStack {
                    Capsule()
                        .fill(
                            viewModel.canCreate
                                ? Color.orange.gradient
                                : Color.gray.gradient
                        )
                        .frame(width: size * 0.42, height: size * 0.88)
                        .rotationEffect(.degrees(viewModel.canCreate ? 28 : 8))

                    Circle()
                        .fill(viewModel.canCreate ? Color.yellow : Color.gray)
                        .frame(width: size * 0.42, height: size * 0.42)
                        .offset(
                            x: viewModel.canCreate ? size * 0.18 : size * 0.06,
                            y: viewModel.canCreate ? -size * 0.30 : -size * 0.34
                        )
                }
                .frame(height: size * 0.72)

                Text(viewModel.isCreating ? "BUILDING" : "MAKE")
                    .font(.system(size: max(10, size * 0.13), weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(.black.opacity(0.66), in: Capsule())
            }
            .rotationEffect(.degrees(leverWobble && !reduceMotion ? -6 : 0))
            .shadow(
                color: viewModel.canCreate ? .orange.opacity(0.72) : .clear,
                radius: 10
            )
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isCreating)
        .frame(width: size, height: size)
        .accessibilityLabel(viewModel.canCreate ? "Make creature" : "Creature machine lever")
        .accessibilityHint(
            viewModel.canCreate
                ? "Pull to start making the creature"
                : "Choose one creature, outfit, and buddy first"
        )
    }

    private func focus(_ station: RadialLabStation) {
        guard activeStation != station else { return }
        withAnimation(reduceMotion ? .easeOut(duration: 0.15) : .spring(response: 0.45, dampingFraction: 0.82)) {
            activeStation = station
        }
        CreatureLab2DDiagnostics.emit(
            "CREATURE_LAB_2D_EVENT station=\(station.rawValue) action=focus"
        )
    }

    private func confirm(
        _ ingredient: CreatureIngredient,
        at station: RadialLabStation
    ) {
        switch station {
        case .creature:
            viewModel.selectCreature(ingredient)
        case .outfit:
            viewModel.selectOutfit(ingredient)
        case .buddy:
            viewModel.selectBuddy(ingredient)
        }

        CreatureLab2DDiagnostics.emit(
            "CREATURE_LAB_2D_EVENT station=\(station.rawValue) " +
            "action=confirmed option=\(ingredient.id)"
        )

        withAnimation(.easeOut(duration: 0.26)) {
            activeStation = nil
        }
    }

    private func attemptFabrication() {
        guard viewModel.canCreate else {
            CreatureLab2DDiagnostics.emit(
                "CREATURE_LAB_2D_EVENT lever=fabricate action=wobble_unready"
            )
            withAnimation(.spring(response: 0.16, dampingFraction: 0.35)) {
                leverWobble = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
                withAnimation(.spring(response: 0.20, dampingFraction: 0.62)) {
                    leverWobble = false
                }
            }
            return
        }

        CreatureLab2DDiagnostics.emit(
            "CREATURE_LAB_2D_EVENT chamber=center state=fabricate_start"
        )
        withAnimation(.easeInOut(duration: 0.22)) {
            activeStation = nil
        }
        viewModel.createCreature()
    }

    private func synchronizeBrowseIndices() {
        creatureIndex = index(
            of: viewModel.selectedCreature,
            in: viewModel.creatures
        )
        outfitIndex = index(
            of: viewModel.selectedOutfit,
            in: viewModel.outfits
        )
        buddyIndex = index(
            of: viewModel.selectedBuddy,
            in: viewModel.buddies
        )
    }

    private func runAutomatedVerificationIfRequested() {
        guard ProcessInfo.processInfo.arguments.contains("-verifyCreatureLab2D")
        else { return }

        Task { @MainActor in
            CreatureLab2DDiagnostics.emit("CREATURE_LAB_2D_VERIFY state=started")
            try? await Task.sleep(for: .milliseconds(180))

            if let creature = viewModel.creatures.first(where: { $0.id == "cat" })
                ?? viewModel.creatures.first {
                focus(.creature)
                confirm(creature, at: .creature)
            }

            try? await Task.sleep(for: .milliseconds(180))
            if let outfit = viewModel.outfits.first(where: { $0.id == "superhero" })
                ?? viewModel.outfits.first {
                focus(.outfit)
                confirm(outfit, at: .outfit)
            }

            try? await Task.sleep(for: .milliseconds(180))
            if let buddy = viewModel.buddies.first(where: { $0.id == "fox" })
                ?? viewModel.buddies.first {
                focus(.buddy)
                confirm(buddy, at: .buddy)
            }

            CreatureLab2DDiagnostics.emit(
                "CREATURE_LAB_2D_VERIFY state=complete " +
                "creature=\(viewModel.selectedCreature?.id ?? "none") " +
                "outfit=\(viewModel.selectedOutfit?.id ?? "none") " +
                "buddy=\(viewModel.selectedBuddy?.id ?? "none") " +
                "leverReady=\(viewModel.canCreate)"
            )
        }
    }

    private func index(
        of ingredient: CreatureIngredient?,
        in ingredients: [CreatureIngredient]
    ) -> Int {
        guard let ingredient,
              let index = ingredients.firstIndex(where: { $0.id == ingredient.id }) else {
            return 0
        }
        return index
    }

    private func synchronizeIndex(
        for ingredientID: String?,
        in ingredients: [CreatureIngredient],
        target: Binding<Int>
    ) {
        guard let ingredientID,
              let index = ingredients.firstIndex(where: { $0.id == ingredientID }) else {
            return
        }
        target.wrappedValue = index
    }

    private func boardSize(in available: CGSize) -> CGSize {
        let aspect: CGFloat = 4.0 / 3.0
        let horizontalPadding: CGFloat = 16
        let verticalPadding: CGFloat = 10
        let width = max(1, available.width - horizontalPadding * 2)
        let height = max(1, available.height - verticalPadding * 2)

        if width / height > aspect {
            return CGSize(width: height * aspect, height: height)
        }
        return CGSize(width: width, height: width / aspect)
    }
}

private struct RadialSelectorStation: View {
    let station: RadialLabStation
    let ingredients: [CreatureIngredient]
    @Binding var browseIndex: Int
    let selectedID: String?
    let isActive: Bool
    let isDimmed: Bool
    let width: CGFloat
    let reduceMotion: Bool
    let onFocus: () -> Void
    let onBrowse: (CreatureIngredient) -> Void
    let onConfirm: (CreatureIngredient) -> Void

    private var current: CreatureIngredient? {
        ingredient(offset: 0)
    }

    var body: some View {
        TimelineView(.animation) { context in
            let seconds = context.date.timeIntervalSinceReferenceDate
            let phase = Double(stationIndex) * 1.9
            let wave = reduceMotion ? 0 : sin(seconds * .pi * 0.70 + phase)

            VStack(spacing: width * 0.025) {
                machineLabel

                ZStack {
                    RoundedRectangle(cornerRadius: width * 0.17)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.16, green: 0.07, blue: 0.23),
                                    station.accent.opacity(0.82)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )

                    RoundedRectangle(cornerRadius: width * 0.17)
                        .stroke(
                            selectedID == current?.id ? Color.yellow : station.accent,
                            lineWidth: selectedID == current?.id ? 5 : 3
                        )

                    HStack(spacing: width * 0.015) {
                        optionButton(offset: -1, scale: 0.70)
                        optionButton(offset: 0, scale: 1.0)
                        optionButton(offset: 1, scale: 0.70)
                    }
                    .padding(.horizontal, width * 0.035)
                    .padding(.vertical, width * 0.045)
                }
                .frame(width: width, height: width * 0.55)
                .shadow(
                    color: isActive ? station.accent.opacity(0.72) : .black.opacity(0.32),
                    radius: isActive ? 15 : 7,
                    y: 5
                )

                Text(isActive ? station.prompt : current?.name.uppercased() ?? station.prompt)
                    .font(.system(size: max(9, width * 0.065), weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.62)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.black.opacity(0.68), in: Capsule())
            }
            .scaleEffect((isActive ? 1.12 : 1.0) * (1 + wave * 0.012))
            .offset(y: wave * -1.8)
            .opacity(isDimmed ? 0.56 : 1)
            .animation(
                reduceMotion
                    ? .easeOut(duration: 0.15)
                    : .spring(response: 0.42, dampingFraction: 0.80),
                value: isActive
            )
            .contentShape(Rectangle())
            .onTapGesture {
                if !isActive {
                    onFocus()
                }
            }
            .simultaneousGesture(
                DragGesture(minimumDistance: 12)
                    .onEnded { value in
                        guard abs(value.translation.width) >= 24,
                              abs(value.translation.width) > abs(value.translation.height) else {
                            return
                        }
                        browse(value.translation.width < 0 ? 1 : -1)
                    }
            )
        }
        .frame(width: width * 1.18, height: width * 0.84)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(station.title) machine")
        .accessibilityHint("Swipe to browse, then activate the center choice")
    }

    private var machineLabel: some View {
        HStack(spacing: 5) {
            Image(systemName: station.symbol)
            Text(station.title)
        }
        .font(.system(size: max(10, width * 0.072), weight: .black, design: .rounded))
        .foregroundStyle(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .background(station.accent.opacity(0.92), in: Capsule())
        .overlay {
            Capsule().stroke(.white.opacity(0.75), lineWidth: 1.5)
        }
    }

    @ViewBuilder
    private func optionButton(offset: Int, scale: CGFloat) -> some View {
        if let ingredient = ingredient(offset: offset) {
            Button {
                if offset == 0 {
                    if isActive {
                        onConfirm(ingredient)
                    } else {
                        onFocus()
                    }
                } else {
                    browse(offset)
                }
            } label: {
                ZStack {
                    Image(ingredient.artworkName)
                        .resizable()
                        .scaledToFill()
                        .frame(
                            width: width * 0.265 * scale,
                            height: width * 0.31 * scale
                        )
                        .clipped()

                    RoundedRectangle(cornerRadius: width * 0.05)
                        .stroke(
                            offset == 0 && selectedID == ingredient.id
                                ? Color.yellow
                                : Color.white.opacity(offset == 0 ? 0.82 : 0.45),
                            lineWidth: offset == 0 ? 4 : 2
                        )
                }
                .clipShape(RoundedRectangle(cornerRadius: width * 0.05))
                .shadow(
                    color: offset == 0 ? station.accent.opacity(0.65) : .clear,
                    radius: 7
                )
                .offset(y: offset == 0 ? -width * 0.018 : width * 0.025)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(
                offset == 0
                    ? "\(ingredient.name), center choice"
                    : "\(ingredient.name), nearby choice"
            )
            .accessibilityHint(
                offset == 0
                    ? "Select this \(station.rawValue)"
                    : "Move this choice to the center"
            )
        }
    }

    private func browse(_ delta: Int) {
        guard !ingredients.isEmpty else { return }
        let nextIndex = (browseIndex + delta + ingredients.count) % ingredients.count
        withAnimation(
            reduceMotion
                ? .easeOut(duration: 0.15)
                : .spring(response: 0.32, dampingFraction: 0.78)
        ) {
            browseIndex = nextIndex
        }
        onBrowse(ingredients[nextIndex])
    }

    private func ingredient(offset: Int) -> CreatureIngredient? {
        guard !ingredients.isEmpty else { return nil }
        let safeIndex = (browseIndex + offset + ingredients.count) % ingredients.count
        return ingredients[safeIndex]
    }

    private var stationIndex: Int {
        RadialLabStation.allCases.firstIndex(of: station) ?? 0
    }
}

private struct RadialLabEnergyChannels: View {
    let creatureSelected: Bool
    let outfitSelected: Bool
    let buddySelected: Bool

    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width * 0.50, y: size.height * 0.535)
            let feeds: [(CGPoint, Bool, Color)] = [
                (
                    CGPoint(x: size.width * 0.225, y: size.height * 0.525),
                    creatureSelected,
                    Color(red: 0.64, green: 0.37, blue: 0.96)
                ),
                (
                    CGPoint(x: size.width * 0.775, y: size.height * 0.525),
                    outfitSelected,
                    Color(red: 0.96, green: 0.50, blue: 0.22)
                ),
                (
                    CGPoint(x: size.width * 0.50, y: size.height * 0.245),
                    buddySelected,
                    Color(red: 0.30, green: 0.84, blue: 0.64)
                )
            ]

            for (start, selected, color) in feeds {
                var path = Path()
                path.move(to: start)
                path.addLine(to: center)

                context.stroke(
                    path,
                    with: .color(Color.black.opacity(0.42)),
                    style: StrokeStyle(lineWidth: 15, lineCap: .round)
                )
                context.stroke(
                    path,
                    with: .color(
                        selected
                            ? color.opacity(0.92)
                            : Color(red: 0.18, green: 0.52, blue: 0.55).opacity(0.32)
                    ),
                    style: StrokeStyle(
                        lineWidth: selected ? 8 : 5,
                        lineCap: .round,
                        dash: selected ? [] : [7, 8]
                    )
                )
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct RadialLabReactor: View {
    let creature: CreatureIngredient?
    let outfit: CreatureIngredient?
    let buddy: CreatureIngredient?
    let isCreating: Bool
    let size: CGFloat

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation) { context in
            let seconds = context.date.timeIntervalSinceReferenceDate
            let pulse = reduceMotion ? 0 : sin(seconds * .pi * (isCreating ? 2.2 : 0.8))

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.cyan.opacity(isCreating ? 0.82 : 0.48),
                                Color.purple.opacity(0.82),
                                Color(red: 0.10, green: 0.04, blue: 0.16)
                            ],
                            center: .center,
                            startRadius: 2,
                            endRadius: size * 0.55
                        )
                    )

                Circle()
                    .stroke(Color(red: 0.80, green: 0.61, blue: 0.30), lineWidth: size * 0.07)

                HStack(spacing: -size * 0.055) {
                    IngredientArtworkChip(
                        ingredient: creature,
                        size: size * 0.30,
                        accent: .purple
                    )
                    IngredientArtworkChip(
                        ingredient: outfit,
                        size: size * 0.30,
                        accent: .orange
                    )
                    IngredientArtworkChip(
                        ingredient: buddy,
                        size: size * 0.30,
                        accent: .green
                    )
                }

                if isCreating {
                    ForEach(0..<8, id: \.self) { index in
                        CreatureLabSparkle(
                            color: index.isMultiple(of: 2) ? .yellow : .mint,
                            size: size * 0.075
                        )
                        .offset(y: -size * 0.62)
                        .rotationEffect(.degrees(Double(index) * 45 + seconds * 120))
                    }
                }
            }
            .frame(width: size, height: size)
            .scaleEffect(1 + pulse * (isCreating ? 0.04 : 0.012))
            .shadow(
                color: isCreating ? .cyan.opacity(0.85) : .purple.opacity(0.55),
                radius: isCreating ? 22 : 10
            )
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            [creature, outfit, buddy].compactMap { $0?.name }.isEmpty
                ? "Empty creature reactor"
                : "Creature reactor with selected ingredients"
        )
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        RadialCreatureLabView(viewModel: CreatureBuilderViewModel())
    }
}
