# Changelog

## [1.15.3](https://github.com/hexon-studio/atom-core/compare/v1.15.2...v1.15.3) (2025-01-10)


### Bug Fixes

* refactor missing resource calculation in loadCargo action to enhance clarity and accuracy ([3a4ac03](https://github.com/hexon-studio/atom-core/commit/3a4ac030d4ae084bcf48987140e1d4f096bebebf))

## [1.15.2](https://github.com/hexon-studio/atom-core/compare/v1.15.1...v1.15.2) (2025-01-10)


### Bug Fixes

* improve resource difference calculation in loadCargo and unloadCargo actions ([d646c10](https://github.com/hexon-studio/atom-core/commit/d646c10985190d0507bfef8ff3eb004bc65b9bf2))

## [1.15.1](https://github.com/hexon-studio/atom-core/compare/v1.15.0...v1.15.1) (2025-01-10)


### Bug Fixes

* loadCargo type error ([140da27](https://github.com/hexon-studio/atom-core/commit/140da27cb92461780a3303642aafa9e1fdb050b4))

# [1.15.0](https://github.com/hexon-studio/atom-core/compare/v1.14.3...v1.15.0) (2025-01-08)


### Features

* add UUID generation for cargo items and update related logic ([485dd26](https://github.com/hexon-studio/atom-core/commit/485dd268309a2f7ccc9bfb4f113f49db75da59ee))

## [1.14.3](https://github.com/hexon-studio/atom-core/compare/v1.14.2...v1.14.3) (2025-01-08)

## [1.14.2](https://github.com/hexon-studio/atom-core/compare/v1.14.1...v1.14.2) (2025-01-07)

## [1.14.1](https://github.com/hexon-studio/atom-core/compare/v1.14.0...v1.14.1) (2025-01-05)


### Bug Fixes

* fees and actions ([e473689](https://github.com/hexon-studio/atom-core/commit/e473689f2ed3a4af0817ef8cd92340bd85fea17c))

# [1.14.0](https://github.com/hexon-studio/atom-core/compare/v1.13.0...v1.14.0) (2025-01-04)


### Features

* add main createApi export ([9e65dc1](https://github.com/hexon-studio/atom-core/commit/9e65dc1d651325ae72980fa205369d172e0137f7))
* improve load/unload cargo ([9f6d9ee](https://github.com/hexon-studio/atom-core/commit/9f6d9ee6206d63dcce9008c988653b02c906df58))

# [1.13.0](https://github.com/hexon-studio/atom-core/compare/v1.12.0...v1.13.0) (2025-01-02)


### Features

* add LoadUnloadFailedError and export warp command ([925a356](https://github.com/hexon-studio/atom-core/commit/925a35635f2b3786aa59a4ceca3f4f593a1e7948))

# [1.12.0](https://github.com/hexon-studio/atom-core/compare/v1.11.3...v1.12.0) (2024-12-26)


### Features

* add fee limit ([4b8ac0b](https://github.com/hexon-studio/atom-core/commit/4b8ac0b2408301c58ca6012fa0d5d6d135242631))

## [1.11.3](https://github.com/hexon-studio/atom-core/compare/v1.11.2...v1.11.3) (2024-12-23)


### Bug Fixes

* update @solana/web3.js dependency version to exact match ([1b787ba](https://github.com/hexon-studio/atom-core/commit/1b787ba60915e4ad348a3a55d9ae778e05d7bd32))

## [1.11.2](https://github.com/hexon-studio/atom-core/compare/v1.11.1...v1.11.2) (2024-12-19)


### Bug Fixes

* load cargo missing resources condition ([4d4d173](https://github.com/hexon-studio/atom-core/commit/4d4d173a7bed7242fbdcf66d1806c06c94972c99))

## [1.11.1](https://github.com/hexon-studio/atom-core/compare/v1.11.0...v1.11.1) (2024-12-19)


### Bug Fixes

* load cargo missing resources condition ([62e9b5b](https://github.com/hexon-studio/atom-core/commit/62e9b5b839142abdb807c3d39c314fdc961b6702))

# [1.11.0](https://github.com/hexon-studio/atom-core/compare/v1.10.0...v1.11.0) (2024-12-17)


### Features

* add load/unload error with input items type ([676ce7d](https://github.com/hexon-studio/atom-core/commit/676ce7d4b9d4175929386162e82989b687f2ba2b))

# [1.10.0](https://github.com/hexon-studio/atom-core/compare/v1.9.0...v1.10.0) (2024-12-17)


### Features

* add load/unload error missing resources difference ([ee5a35e](https://github.com/hexon-studio/atom-core/commit/ee5a35ecc8c152926aa14431a1d23afb6c15d745))

# [1.9.0](https://github.com/hexon-studio/atom-core/compare/v1.8.4...v1.9.0) (2024-12-16)


### Features

* send load unload state if some send transaciton errors occurs ([9f00b21](https://github.com/hexon-studio/atom-core/commit/9f00b2142eb3497ce00631a65bf8af7db391149b))

## [1.8.4](https://github.com/hexon-studio/atom-core/compare/v1.8.3...v1.8.4) (2024-12-13)


### Bug Fixes

* add concurrency in load/unload ([afa4137](https://github.com/hexon-studio/atom-core/commit/afa4137318bab0f6c830d079f0cec37623ca04ab))

## [1.8.3](https://github.com/hexon-studio/atom-core/compare/v1.8.2...v1.8.3) (2024-12-13)


### Bug Fixes

* load-cargo logic ([5d7a49e](https://github.com/hexon-studio/atom-core/commit/5d7a49ed5a3fc7e68e0e0d52b6c31e1c9b0ec344))

## [1.8.2](https://github.com/hexon-studio/atom-core/compare/v1.8.1...v1.8.2) (2024-12-12)


### Bug Fixes

* load-cargo simplify logic ([1a77cd0](https://github.com/hexon-studio/atom-core/commit/1a77cd01c92102f711206b7110f5b0b632149ac8))
* load-cargo skip resource instead of breking the loop ([cfa6755](https://github.com/hexon-studio/atom-core/commit/cfa6755d2c02b3f3b29f2f7fc888d693e1858865))

## [1.8.1](https://github.com/hexon-studio/atom-core/compare/v1.8.0...v1.8.1) (2024-12-12)


### Bug Fixes

* improve logs ([998d690](https://github.com/hexon-studio/atom-core/commit/998d6901f196620c8ee82517446e8a410aededf6))

# [1.8.0](https://github.com/hexon-studio/atom-core/compare/v1.7.4...v1.8.0) (2024-12-11)


### Features

* skip cargo resources if max cargo capacity is reached ([c03d40b](https://github.com/hexon-studio/atom-core/commit/c03d40be0a69fea54f6ee64f997ac98eb11752df))

## [1.7.4](https://github.com/hexon-studio/atom-core/compare/v1.7.3...v1.7.4) (2024-12-07)


### Bug Fixes

* load-cargo compute ([30311da](https://github.com/hexon-studio/atom-core/commit/30311dadcec28b8a3fecda8a506570ef511c7e7f))
* unload-cargo compute ([2af5c77](https://github.com/hexon-studio/atom-core/commit/2af5c77f7eecb36a31a34584a87da68dfe13bec5))

## [1.7.3](https://github.com/hexon-studio/atom-core/compare/v1.7.2...v1.7.3) (2024-12-07)

## [1.7.2](https://github.com/hexon-studio/atom-core/compare/v1.7.1...v1.7.2) (2024-12-04)


### Bug Fixes

* changed delay time to 10 seconds ([3163cf9](https://github.com/hexon-studio/atom-core/commit/3163cf9682cce8d9d6091f1c73ca41c440debc9b))

## [1.7.1](https://github.com/hexon-studio/atom-core/compare/v1.7.0...v1.7.1) (2024-12-03)


### Bug Fixes

* add pkg version ([e20f14c](https://github.com/hexon-studio/atom-core/commit/e20f14ccbe984f80de777e0dee110005796526df))

# [1.7.0](https://github.com/hexon-studio/atom-core/compare/v1.6.1...v1.7.0) (2024-12-03)


### Bug Fixes

* added warp is on cooldown error ([f90bee3](https://github.com/hexon-studio/atom-core/commit/f90bee304b04738cd4fbac91273b6b2dcd580581))


### Features

* enrich error infos ([d485c20](https://github.com/hexon-studio/atom-core/commit/d485c208acf353207a5ce2acd3276957a8b6ac3e))

## [1.6.1](https://github.com/hexon-studio/atom-core/compare/v1.6.0...v1.6.1) (2024-12-03)


### Bug Fixes

* unload delay minor fix ([fb873f0](https://github.com/hexon-studio/atom-core/commit/fb873f0bb80eaa2960fd48819b98a507ba44542b))

# [1.6.0](https://github.com/hexon-studio/atom-core/compare/v1.5.2...v1.6.0) (2024-12-03)


### Features

* add atom version in log context ([c167211](https://github.com/hexon-studio/atom-core/commit/c167211409544c35edd9cdd229d9df63c673f89f))

## [1.5.2](https://github.com/hexon-studio/atom-core/compare/v1.5.1...v1.5.2) (2024-12-03)


### Bug Fixes

* unload delay ([318806a](https://github.com/hexon-studio/atom-core/commit/318806a55defeab37f3284613ffa3d10ca72bc89))

## [1.5.1](https://github.com/hexon-studio/atom-core/compare/v1.5.0...v1.5.1) (2024-12-02)


### Bug Fixes

* new logs ([efd5445](https://github.com/hexon-studio/atom-core/commit/efd5445fb6d642d800e82ebf0697735f349361fc))

# [1.5.0](https://github.com/hexon-studio/atom-core/compare/v1.4.0...v1.5.0) (2024-12-02)


### Features

* add logs ([31401e5](https://github.com/hexon-studio/atom-core/commit/31401e5ec8f8424e7a0818ca622d4bb3deb99bf8))

# [1.4.0](https://github.com/hexon-studio/atom-core/compare/v1.3.1...v1.4.0) (2024-12-01)


### Features

* add logging ([af37974](https://github.com/hexon-studio/atom-core/commit/af379746ecbaffce8ae8de8567302772794a7deb))

## [1.3.1](https://github.com/hexon-studio/atom-core/compare/v1.3.0...v1.3.1) (2024-12-01)


### Bug Fixes

* commitment changed ([4021dad](https://github.com/hexon-studio/atom-core/commit/4021dad3ef39ab7f10f3998f6c1eea81a07a4907))

# [1.3.0](https://github.com/hexon-studio/atom-core/compare/v1.2.3...v1.3.0) (2024-11-25)


### Features

* remove FleetInTargetSectorError ([ff4637d](https://github.com/hexon-studio/atom-core/commit/ff4637df293f29eefb920a311168ffb63fe1fd64))

## [1.2.3](https://github.com/hexon-studio/atom-core/compare/v1.2.2...v1.2.3) (2024-11-25)


### Bug Fixes

* add helius priority fees ([0b311ef](https://github.com/hexon-studio/atom-core/commit/0b311ef0a28ba63d4d05ed98fae493e49d8a9bae))

## [1.2.2](https://github.com/hexon-studio/atom-core/compare/v1.2.1...v1.2.2) (2024-11-24)


### Bug Fixes

* missing passing feeUrl on initGame fn ([2b261eb](https://github.com/hexon-studio/atom-core/commit/2b261ebc996485d85a4960f7485c03cfef87dfb0))

## [1.2.1](https://github.com/hexon-studio/atom-core/compare/v1.2.0...v1.2.1) (2024-11-22)

# [1.2.0](https://github.com/hexon-studio/atom-core/compare/v1.1.6...v1.2.0) (2024-11-22)


### Features

* add fee url ([5670ec8](https://github.com/hexon-studio/atom-core/commit/5670ec86557422e9fbf66411c79a4152cad49b1d))
* add pat checkout token ([4785c74](https://github.com/hexon-studio/atom-core/commit/4785c741a15f0c1e13caa33bc75fdaffc2be41cf))

## [1.1.6](https://github.com/hexon-studio/atom-core/compare/v1.1.5...v1.1.6) (2024-11-21)

## [1.1.5](https://github.com/hexon-studio/atom-core/compare/v1.1.4...v1.1.5) (2024-11-21)

## [1.1.4](https://github.com/hexon-studio/atom-core/compare/v1.1.3...v1.1.4) (2024-11-21)

## [1.1.3](https://github.com/hexon-studio/atom-core/compare/v1.1.2...v1.1.3) (2024-11-21)

## [1.1.2](https://github.com/hexon-studio/atom-core/compare/v1.1.1...v1.1.2) (2024-11-21)

## [1.1.1](https://github.com/hexon-studio/atom-core/compare/v1.1.0...v1.1.1) (2024-11-21)

# [1.1.0](https://github.com/hexon-studio/atom-core/compare/v1.0.0...v1.1.0) (2024-11-21)


### Bug Fixes

* remove credit event ([6d4df8f](https://github.com/hexon-studio/atom-core/commit/6d4df8f8ecda52b24c02bc4e14898d5c7438a9bd))
* remove credit event ([dbec68d](https://github.com/hexon-studio/atom-core/commit/dbec68d5d1e177f813b0a5403e53dd6a0f399d73))


### Features

* add retry ([bc264b1](https://github.com/hexon-studio/atom-core/commit/bc264b1334f301e4e09dbc67e5f116d3a8003929))
* add webhook events ([452d319](https://github.com/hexon-studio/atom-core/commit/452d31958912dbb0e75e49b5a1fa34e8e3c67c51))
