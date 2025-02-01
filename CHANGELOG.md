# Changelog

# [1.28.0](https://github.com/hexon-studio/atom-core/compare/v1.27.0...v1.28.0) (2025-02-01)


### Features

* add FleetNotEnoughSpaceFixedError for precise cargo space validation ([f8b08d8](https://github.com/hexon-studio/atom-core/commit/f8b08d8e4616dc5789ca3e1b23e85f1872f619ac))

# [1.27.0](https://github.com/hexon-studio/atom-core/compare/v1.26.0...v1.27.0) (2025-02-01)


### Features

* refactor stop mining and crew loading actions to use pre-instructions ([2070319](https://github.com/hexon-studio/atom-core/commit/20703194ddce89af79b870fafa955c2cd7cd5ed1))

# [1.26.0](https://github.com/hexon-studio/atom-core/compare/v1.25.0...v1.26.0) (2025-02-01)


### Features

* add load and unload crew commands to CLI ([dc513e9](https://github.com/hexon-studio/atom-core/commit/dc513e9c38b7d350994b5847504b71cce7c92ad1))
* enhance crew loading and unloading commands with argument parsing ([2f44aca](https://github.com/hexon-studio/atom-core/commit/2f44aca713fb20c72c5c8ee4d968da8fef8e456b))
* enhance crew loading and unloading commands with argument parsing ([14bfb89](https://github.com/hexon-studio/atom-core/commit/14bfb89744f011c5975a639a122211bec7429dd5))

# [1.25.0](https://github.com/hexon-studio/atom-core/compare/v1.24.0...v1.25.0) (2025-01-30)


### Bug Fixes

* lint and typechecl ([68deaac](https://github.com/hexon-studio/atom-core/commit/68deaac85d3cbe4f58bfe0f63961d54d78ca7a3b))


### Features

* improve token account creation and transaction handling ([7b90f11](https://github.com/hexon-studio/atom-core/commit/7b90f11a4d03614ef6a6ecc3efc5791b0d803e9c))

# [1.24.0](https://github.com/hexon-studio/atom-core/compare/v1.23.1...v1.24.0) (2025-01-30)


### Bug Fixes

* add missing error ([e19e25a](https://github.com/hexon-studio/atom-core/commit/e19e25a015bd94d9f47993cd18442af1c64f1d0d))


### Features

* add scan ix ([1fea376](https://github.com/hexon-studio/atom-core/commit/1fea37627abb8091150e7291c991744b3b416731))
* enhance scan start logic with cargo space and food checks ([0869366](https://github.com/hexon-studio/atom-core/commit/086936685c2b5c13a86bb8a038bb7ba3862f55e1))

## [1.23.1](https://github.com/hexon-studio/atom-core/compare/v1.23.0...v1.23.1) (2025-01-27)

# [1.23.0](https://github.com/hexon-studio/atom-core/compare/v1.22.0...v1.23.0) (2025-01-26)


### Features

* update transaction size handling to use maxIxsPerTransaction option ([90f8a27](https://github.com/hexon-studio/atom-core/commit/90f8a277923137f8270bab83fed725653ee17302))

# [1.22.0](https://github.com/hexon-studio/atom-core/compare/v1.21.0...v1.22.0) (2025-01-25)


### Bug Fixes

* add option in game context ([a700491](https://github.com/hexon-studio/atom-core/commit/a7004917b307c9b4681852f84d7f6bbc303bb460))
* rename option mipt ([6fb80a3](https://github.com/hexon-studio/atom-core/commit/6fb80a36ded4dbedb530ebfff6c22d39136a0b6d))


### Features

* add optional transaction size limit to mining, warp, and sector actions ([4a7d380](https://github.com/hexon-studio/atom-core/commit/4a7d380df7c700649ce8aa70c53b5212e9e4516e))

# [1.21.0](https://github.com/hexon-studio/atom-core/compare/v1.20.2...v1.21.0) (2025-01-25)


### Bug Fixes

* adjust transaction size limit logic in unload cargo action ([e6fcb13](https://github.com/hexon-studio/atom-core/commit/e6fcb135e453000e723f6c33132274ed7e2d5276))


### Features

* add optional transaction size limit for load and unload cargo ([342e65c](https://github.com/hexon-studio/atom-core/commit/342e65ca99fe4c9aa0e1796b1ec218eeb48ea2a1))

## [1.20.2](https://github.com/hexon-studio/atom-core/compare/v1.20.1...v1.20.2) (2025-01-24)

## [1.20.1](https://github.com/hexon-studio/atom-core/compare/v1.20.0...v1.20.1) (2025-01-23)

# [1.20.0](https://github.com/hexon-studio/atom-core/compare/v1.19.0...v1.20.0) (2025-01-22)


### Features

* implement transaction building with size parameter ([4c95b59](https://github.com/hexon-studio/atom-core/commit/4c95b59a07c60c4ffe764c0689788357805a43ea))

# [1.19.0](https://github.com/hexon-studio/atom-core/compare/v1.18.0...v1.19.0) (2025-01-21)


### Bug Fixes

* small improvements ([fba938e](https://github.com/hexon-studio/atom-core/commit/fba938ee9436337cfe7cb84ec56ee37b86fd8164))
* update minimum SOL quantity constant ([1e515f8](https://github.com/hexon-studio/atom-core/commit/1e515f8bd6646782c2ae4a934767d8eceaa5f72c))


### Features

* add SOL balance check to base command functionality ([34ea251](https://github.com/hexon-studio/atom-core/commit/34ea2516d8f02a73fda04f816896c4b35cf17c92))

# [1.18.0](https://github.com/hexon-studio/atom-core/compare/v1.17.0...v1.18.0) (2025-01-21)


### Features

* conditionally check atlas balance based on game context ([6cd7142](https://github.com/hexon-studio/atom-core/commit/6cd714282b8e2226b8dbbb5f0327dc403a6441ca))

# [1.17.0](https://github.com/hexon-studio/atom-core/compare/v1.16.0...v1.17.0) (2025-01-20)


### Features

* add sol fee ([6968454](https://github.com/hexon-studio/atom-core/commit/69684549c01fa3697067183d86a5a0513998cf99))

# [1.16.0](https://github.com/hexon-studio/atom-core/compare/v1.15.5...v1.16.0) (2025-01-19)


### Features

* add no-atlas-prime option ([59eb7ff](https://github.com/hexon-studio/atom-core/commit/59eb7ff16bd24dbf27f60f8bdc0af9076296f5f4))

## [1.15.5](https://github.com/hexon-studio/atom-core/compare/v1.15.4...v1.15.5) (2025-01-13)


### Reverts

* Revert "fix: simplify loadCargo action by removing unnecessary error handling and logging" ([18fd0f6](https://github.com/hexon-studio/atom-core/commit/18fd0f6d8a7ac85a09fab9f5c3aa689ce5c96a3b))

## [1.15.4](https://github.com/hexon-studio/atom-core/compare/v1.15.3...v1.15.4) (2025-01-13)


### Bug Fixes

* simplify loadCargo action by removing unnecessary error handling and logging ([d500d69](https://github.com/hexon-studio/atom-core/commit/d500d69e1d38bd93226aae327661a4554f202b58))

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
