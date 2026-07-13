{
  description = "Zero-cost Decades Vintage concept demo";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      devShells = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.mkShell {
            packages = with pkgs; [ nodejs_22 cloudflared ];
            shellHook = ''
              echo "Decades demo · npm install · npm run dev · npm run demo"
            '';
          };
        });
    };
}
