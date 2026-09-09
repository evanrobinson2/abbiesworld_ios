//
//  SettingsView.swift
//  My First Swift
//
//  Settings dialog view
//

import SwiftUI

struct SettingsView: View {
    var onDismiss: () -> Void
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Settings")
                        .font(.title)
                        .fontWeight(.bold)
                        .padding(.top)

                    WorldSkinSection(viewModel: viewModel)
                    
                    // View Mode Section
                    ViewModeSection(viewModel: viewModel)
                    
                    // Other settings sections can go here
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Other Settings")
                            .font(.headline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        SettingsRow(icon: "info.circle.fill", title: "About", action: {})
                        
                        SettingsRow(
                            icon: "power",
                            title: "Quit App",
                            action: {
                                // Quit the app
                                exit(0)
                            }
                        )
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    CloseButton.black() {
                        onDismiss()
                    }
                }
            }
        }
    }
}

struct WorldSkinSection: View {
    @ObservedObject var viewModel: MainViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("World Skin")
                .font(.headline)
                .padding(.horizontal)

            Picker(
                "World Skin",
                selection: Binding(
                    get: { viewModel.mediaPack },
                    set: { viewModel.setMediaPack($0) }
                )
            ) {
                ForEach(MediaPack.allCases) { pack in
                    Label(pack.kidLabel, systemImage: pack.symbolName)
                        .tag(pack)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .accessibilityLabel("World skin")

            Text(
                viewModel.mediaPack == .halloween
                    ? "Halloween uses the bundled spooky pictures and music, even after restarting."
                    : "Everyday uses the classic server pictures and playlist."
            )
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.horizontal)
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.blue)
                    .frame(width: 30)
                
                Text(title)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ViewModeSection: View {
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("View Mode")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                // View mode picker
                Picker("View Mode", selection: Binding(
                    get: { viewModel.viewMode },
                    set: { viewModel.setViewMode($0) }
                )) {
                    Text("Default").tag(ViewMode.default)
                    Text("4 Carousels").tag(ViewMode.fourCarousel)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)
                .disabled(viewModel.mediaPack == .halloween)
                
                // Description text
                Text(
                    viewModel.mediaPack == .halloween
                        ? "Halloween always uses four rows."
                        : (viewModel.viewMode == .default
                           ? "Standard 3-carousel layout"
                           : "Extended layout with style selection")
                )
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            }
        }
    }
}

#Preview {
    // Note: Preview needs a MainViewModel instance
    SettingsView(onDismiss: {}, viewModel: MainViewModel())
}

