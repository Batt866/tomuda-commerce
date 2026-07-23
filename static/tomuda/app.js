const app = document.getElementById("app");
const modal = document.getElementById("modal");
let barcodeScanTarget = "picker",
  barcodeStream = null,
  barcodeScanFrame = 0,
  barcodeScanning = false,
  zxingReader = null,
  zxingControls = null;
const state = {
  ...seed,
  currentView: "worker",
  mobileOpen: false,
  currentEmployee: null,
  isLoggedIn: false,
  searches: {},
  filters: {
    order: "all",
    category: "all",
    inventory: "stock",
    inventoryCategory: "all",
    countCategory: "all",
    worker: "new",
    workerCategory: "",
    workerPay: "all",
    workerDate: "",
    warehouseDate: "",
    reportDate: "",
    promotionTab: "price",
    promotionDetail: "",
  },
  promotionRules: { quantity: [], price: [], payment: [] },
  workerCustomer: "",
  workerStoreReady: false,
  deliveryStoreId: "",
  deliveryStoreReady: false,
  orderEmployee: "emp-hasan",
  deliveryDate: "",
  paymentTerm: "cash",
  isPaid: false,
  settlementAgreed: false,
  settlementText: "",
  settlementMonth: "",
  settlementDay: "",
  applyPercentDiscount: false,
  selectedWorkers: [],
  selectedWarehouseOrderId: "",
  receiptPrintWorkerIds: [],
  receiptPrintWorkerPickerOpen: false,
  receiptPrintDeliveryId: "",
  receiptPrintDeliveryPickerOpen: false,
  receiptPrintOrderIds: [],
  receiptPrintWorkerSyncKey: "",
  permissionEmployeePickerOpen: false,
  selectedDeliveryId: "",
  deliveryName: "",
  deliveryPhone: "",
  workerQty: {},
  pickerActiveId: "",
  pickerQtyProductId: "",
  workerOrderActiveId: "",
  workerOrdersArrived: false,
  workerHighlightOrderId: "",
  receiptEditOrderId: "",
  receiptEditItems: null,
  receiptEditOriginalItems: null,
  extraCategories: [],
  inventoryLogs: [],
  deletionLog: [],
  promotionDeletionLog: [],
  countQty: {},
  countDone: false,
  countOpeningStock: {},
  countSessionStartedAt: null,
  stockInEmployeeId: "",
  stockInDraft: {},
  stockInDone: false,
  stockInReceipt: null,
  stockInSessionStartedAt: null,
  stockInReceipts: [],
  stockInHighlightId: "",
  customerHighlightId: "",
  stockOutEmployeeId: "",
  settings: {
    stockAlertEnabled: true,
    stockAlertMin: 10,
    percentDiscountRate: 3,
    orderRetentionDays: 30,
  },
};
const API_BASE = window.TOMUDA_API_BASE || "/api";
const BRAND = {
  logoWhite: "/static/tomuda/branding/logo-white.png",
  logoBlue: "/static/tomuda/branding/logo-blue.png",
  receiptLogo: "/static/tomuda/branding/receipt-logo.png",
};
const RECEIPT_LOGO_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABWGlDQ1BJQ0MgUHJvZmlsZQAAeJx9kLFLw1AQxr9WpaB1EB0cHDKJQ5SSCro4tBVEcQhVweqUvqapkMZHkiIFN/+Bgv+BCs5uFoc6OjgIopPo5uSk4KLleS+JpCJ6j+N+fO+74zggOW5wbvcDqDu+W1zKK5ulLSX1jAS9IAzm8Zyur0r+rj/j/T703k7LWb///43Biukxqp+UGcZdH0ioxPqezyXvE4+5tBRxS7IV8onkcsjngWe9WCC+JlZYzagQvxCr5R7d6uG63WDRDnL7tOlsrMk5lBNYxA48cNgw0IQCHdk//LOBv4BdcjfhUp+FGnzqyZEiJ5jEy3DAMAOVWEOGUpN3ju53F91PjbWDJ2ChI4S4iLWVDnA2Rydrx9rUPDAyBFy1ueEagdRHmaxWgddTYLgEjN5Qz7ZXzWrh9uk8MPAoxNskkDoEui0hPo6E6B5T8wNw6XwBA6diE8HYWhMAABZrSURBVHja7V1rkBzVdf7Ovbd7ZiWE7YoeBvzC2BFeSSshmTdiJaVIORWXi5TdqpBAAZJYacWjjMuOnTjJqFOJK47jyC4BktYCQmJjlzp+JHGc4KQCg3nIYAUjwQIJBhNbFojwEkg73X3vOfnRPdrVapbHzO5qdrZP1dRu7W5tP+53zvnOud+9lxb1r38BRCeAWQCwoLBONwIUiAiCxIhIiYh80gpkTPbrwjraxFoIM0QRGSJiIoI4d1BcbTdBTbO3cTTm1TR4XlGyhJR+BxyzERFRRoOde+yRbTtWFf7R+bao/6ofauNdZF3Mpo5+ItKoVNSi5/bdBr+0VFLrC0nHO4SaDilPIEqbmJ17Yu/ceZ+Q5/aZ+q/MUX8YhowNaxcqpbqdwqMQ0tMiBXT+QzII3QB3IQwZ/VfJKAAMe4EQMcfxzx7ZOrCwCJadYz396/YAauaxEfDYIkFJ9vOiHOiYqg8EQEuD8VbTPThOn1qHxuBAhU1rKwBQAKCwAgCFFQAorABAYQUACisAUFgBgMIKABRWAKCwAgCFFQAorABAYQUACisAUFgBgMIKABTWYWYm+XrUW+mdUkrjuYNzJQKA7m5BGAo6TCo32QCQali1U/yd5SBegSrACEMuAPAmXhoAmf+ZNbPMYf+3RYSIqE08yQEYIygxiwFeI+iXqEwHPKsPPLBly8EMxNUjf9ZbqZipCoZJAUBvb6+uVqt2xmt8Ec3q+qaLUxC1h+pcYEbpZWnkLyEiYGFw7KyFe2HRxr5nCLQHmu7Xiu5/6KtbH6uGYRbVRChYvVpFUcRTJVVMTgRYsQKoViGsV3DinEvSFIA3JeJ9NrCKiAwpNY+0nkdKnQXIOpekrmfjhodZ0w+0o28/TPTTKAspCIJAR1HkCgAAqIahA0BW6eWKnSYRAtHUqUAoh4FzEGYWEQGIiKCVMUuN0UvZJZ9ffPXGOxX4ayrlb0cDAykAoFJR7ZwaJn4QKhUFQHrWrXsfEXWLtWib+P9Wg0F235qIDBE0AOE0ZTtUsyJC0GqVGO+b1jc/OWPjhssAAGHIQRBotOlKqwkHQG9+DTFyrvZ8XxgOnbPsjECkiMgAAKeps3HiQNQjnvd3PVdvuGfRNRuW56lAcmeYto2gVfVQ2sF9FU0EzWnKNk4caXM+gao91/Rvnr9mzSyEIfdWKmZaAaAahjYIAi2kl7NzIHT+ngNZVIB2aerEMpTnf9KfUbpvUf+6ZdUwtO0EgokdjDzkPTl79q8rUqeJtTKlyF/rFYQGgezQkFWkFpL2716ycf0l7QSCCR2Mev5nTi/Qvq9FxGEaGhEZZ60T5hniebf39K/5dLuAYEIBMHfBoAAAK6yS0bsxTTcQABrMwknqVHnmlxavv2pTO4BgIgFA0erIfeTaj5RI6Fy20yT/v0EoAKBsLbE0o6vS03/VHx5vEEzcgASBAoB98XsWQOv3iHPTKv+/LgwAbWuxVaWuLyzcsGZNBoJe01EA6O3uzuK94guV79N0zf9jgkBEuyRx2isN9PRdeUE1rNq8YdQZAKgOZvnfKqwES72dWtiIdCDMJEJavNK3llx75Zyou3vSm0UTdTFCFLnujcEJhulsthYk0hjdJEd/phcGFFtrteef4lJvAGHIweAgTX0A5Plf89sWkjGzmTkVwImIFYz6CEZ95KjPpL0JERYce/3snuEgwhMEAmNrNavL5YsXbVj7e1EUuclMBRNCPHq7u6maJbqLvVmztD00pEnRmPVR4wHJvrgkAUQmctCZiAx5ntJKqYapSgTsHMQ6EYjLGjzjl9MIUGwtQ+svL+rv/9do7txXkM2YypQEQHXTJocwBBTdmQwN/cKxs2T5LUUbJUIgpGD3x2T894h1AhqnRkI2n8vKGK2NVi5JwC59Qhz2kND/sMhzICRE1AWWk6FkPgn1kKffq7VnOE3BzjnKqhoahzCg2Fprurremca1zyIMPxcMDuq6tmDKAaCO3D037rgDwB3N/psl66/sFq88j51jjNM25iLilNZae552Sfq0xPHXS2K/O/Oxn+2tVsfWK55z/fVdh4Ze/bBj/gQJXWLK5TkuSSDMTONQ3hKRdnHMCrhm8fr1W6Lt2381GVqCia09g0AfKQffgu178UV9xrPP2ifIfEUZryS25sYj4oqIM6WSdi59VpL4r2bV0h333XLLq8O3G+gDDe63OjgouzZvHgLwIwA/Ovu6tV8YSuk6UrhOGf8ElySOqOV9lUmYnSmXZ7ra4U8C+EywYIGKpmQEqFsUuWoToEEUxSdcc+ViQP+Gi2Meh5cLAM6Uy5rT5B/8lK/bPTCwHzhK0ClvIOEiBIHq7T5A1fDm5wB8/oz+tV9noQFTLl9ga7Elau19EpHmNBUoWnv61Zf9ZbR69Qt5ipkwLtB2nbne7gMEAM6qtco3Slpn3wKQU76vXVL7sz03bgt2Dwzsz9uvVA1Dm4dZecP/E0Uul7VTb6ViHtp682Mmdas4SW8z5ZIRtFy1EDvHutT1Dp9LQQ7QCa0I2g0AVA2rdllf3wyAPs6Jzc63aW30nfY9zUn8ub03DVSCINCoVFSu5JXXJ+dj/9tqGFoEgd69fbvdc9PWKzhNvmZKZdNqxzM7vYVFRF0KIFt7MF0AEOT9g9S4C1XJP5ktcyvzB3nONy6ubdm7deCLy/r6vCiKGuv3JfPqETW41HnBmJq+KHLYtImCINB7btzW5+L4DlMqtTrtrTlNCURnL1l/xQcRhjyR3cG2AsARAib4KCkjAHGrnu/i+Cenv/Dy9cHOnXr3wEBDrw+CQIMyr67zgN7ebIYuiiJX1/Q1bNCEIUfd3QKAtEkuczZ5VmlNrTSORMTqUskI+b8JDOsqph4JfKv9gzB0qEDRAeoV6yibPm6O/RNAws6SpH1RFLkgW/5zbMivVFQUhm5Z3yWzrTnx46zkIhL54Eu8f+bi7r6DotSjiuQH5ede/F4URUM5SXWjQdBbqZhqGD7fs+Gq61XJ/6Zldk3XLZTxPiG5CMCN9XmVzo4AuXx8ybNXnCZQp7N1TcvHRWB1qaTYutv3bLvlod5KxTRg+FSvs3uu7etP/LfvIb+8TRv/46S9Hhh9Gox3hvL8S2H824fmzX5o8fp1v4MxWrV17eOebV/7lo3jH2vP02iykUMiiq0DBEt7L7+8nAOOOhoA9TDnyD9PlUpGhG2zD50rc12J6a8BUAMPoiAIFMKQF23s26G8rptIcJKtDVlbSx0nliV1zGnKtlZzthY7IZpPXV3fWbSh74/G6tcfyCsYD/Kl7FzG5juD4hxEqVNenumdljtIZwNg7oIFkt/RqhbB7pTnETt3/+6Bgb2oVGh0yA6CQEVR5Bb2r/kb0zVjrR2qpeIcH1nwQaTqHyLSRKQltezixOoZXX+xqH9dXyMQVMOqA0Clrpd/YOPaPqW1boELOOX5yoqaDwC9d92lOhkAFK1e7Zb19XlgnJ/Jx5u7NxEIaQUC/1MjAlVfs7f46rUrtN91fTpUSwkwb1htECmIKFeLmUh/5ax1606Nomg0Q5dg5061a3M0RER3KGMgTZZxIhBSgAF/EEC2vrJjAZCHtwTJ6aTUqa3Ix4mgJUmhUqkCwNxR4T9n7HCi/xRQAuY3P6FDpISZVanc9VpJPg1ARgPswKOPUnYbXG2tgSeAEAT63R3fB6i/RFL+Bcr3VdN1tAiT1sTO7us6eHBvXsbxUUQzDHlR/5XvJ6gLOEnwVtvMBChOUlGsLl7W1zcjbygdAVDON0Q7HuTUovk2NtWfaU4jIHcUAOoPJworW/EaAbEyGkS4f1cUDeU5WkYDTYtarn3PE2kiPBMpZgdN5mSyWX4+iqDlEUYn/Jw4V8srGWli/ElEQKATASDq4AhAURS53ssvL7PIuWxbaf9maw8UcOdRjaVRRJNJrRjZ7WvCNxlGIzE8DwCOknFl+wjhsNaHQBhqdhaThktCfySwOg8Aefv3tbLpMVq/Syy3kP9Jc5Iwi74bOKaPPkw0hcZlnaJ9gzJfpP1XwigSHCW5mmxtZl0vYIl6lWcgaCH/G03C/NQ75s17fKQ3Hk00cToUnZopjJqeZ1BiLXwy+0cSy5HX6dL6BAK6pEk5mwx/jQEArYpFR6CR2ikC1L1USK0UznJfs/mftIYQ31sNQxvsbJz/oWW5LpVaJ5rMvyzPePG/jwFaPlCW6J1kdAkZAqiZCxERmOggAASTxwEIk7iGjxCGfNa1v38iBGeKZZA0nf+JQCBRWf5/dFT+rxNNYKW0IDIVyoimIuzatbkB0cwiGgnxQmU8NA+0+jd8oBGfaZ5VHP29ep0rT0L6z/I/W/8M5ZnZ7Cw32/8npbSLY2uUubdh/o8id04QdCmhc7J1ik0CLdseCAJ6PaIpBPSOxzvSoGcmvg9wnKhK/eUlolfAGEiz078irLSGQB5/aM6cp+qRZTTRrM1++0Jo/a5W1ilm4s2EfSc/GotoXnTppTOZ6KK8ommuD5CtHIITfrJj+wDD+Z9WCDOo6fyPPP/LPfnUrG5ENAHXq/xWwnJGNMH2aQDHEM36NrjPzTIf1SX/JLbONR3RAC1pyr6oJ44hmh0CAEIY8rK+S2ZDsFSsbf5+iAgi8IT/8/WAxlArhbn5aWaAlTYA6N7dAwNpriuUYZ4xV7JCyvuMcAvLITOiCRH+xftPOumpY4hmJwCgnv8TdcKZyvdPZMfcZDISItIuiWt+Wru/UVhGGPJ5a9bMYtCZ0tI+BXlTTx8LtLrmoGfDVZfqUtcyl6SvswftmwMaER6MwjDBKKLZEQCo538iXklKZw7anLEyBhDsfWDHN345Ov/XgXawJEu1MXPEuWZ9U0iRcXFijeBoopmLTLs3Xv5OaPoypylTq8yKACL8x9EprEWTNgJAddMml9fvF2b5v1n1jwhpBRDfnXuibgQ0wPSSp5uenoWIkNYA+PGPzXnXMNHMp4MrFSiD0u3KeHPYOWlhJZMQKcNJnLDYf28Q0cbVjo8msFJRIOLF69ef4gQ93Er+B5Q4hkJW/49my/WXR0IrxKGl/K+1VpLinjDXAM4dHJQo2wYX3+2/6uu6VF6Z1mJb3ziy6YjmGSVJvGvvtlufmujlYccFAMGCQYoAiJKztV/ucknsmiyXRCmtOE1e1SZ9ABg1/Zt76ZlXX/ZrQ4yl0kr9nxNNiNyZef3PTRRFtWV9H52Reiffqr3yalurtTr4EBGQUsSgv693MCcyAhyXFDDcpeOVivKnbtJbyGgI5KGfbrn1+bqwdHT+j8U/U3ve27L83zzR5CROxOFBhCFXw9tqy66+Yqn1TrmbvPLqtBZbtDj4gIjSWrm49gLotW8DRzbaRkcBoBqGrlKpKCF1YWvyryz/Sz79e4w6Z3idwSrSLeT/nGgy8OM9O3Y8fcbGNe9dcs36zSnK90HrZa4Wu1bXBeZNRqd8jwC3Y+/W218aXWZ2BgByL/3+/v2ngvAhds3vHk6AEusApe4ChvclGgm0bPz1heJaIJrDV3ytp79viyN/L0zpk8IoucRyvnN4y+NPWikX1171nf4qAJroZWHHBQB1L02NnKd93xOWZjXvQlorTtMXyqk8hIwA8GigLV6//hQBelppNBGgOU2glPotVSpfI4JZtlZz+YzduO1boP2SEue27B4Y2B/sDMaf/FEbAOCI/FuwKu/HSJNemdX/RA/uHhh4ZXT+70Umoxbic4xf6mKRFhdXEIRZbC22yA49Gr8zAERYGaNtcnjf4bcf/CtUKioKovH3/nboA0SrV7veSq+ByPniWpqVEygFjJH/gRU5S+SVUNQK0RxdCxiM8/RZDmaCyKee+mL0SjA4SKDJmZadXADkTZOXn3/vfJA+jVuRf4M0pykg7u4x878IKdHLWyr/JthExJqusnFxLXrkph07J/usoUl9KcNe6l2gWlXlGEVi01/N7Jr18Fj5/8Mb15wqRB9i59rymBoRYeV5xiXxM67sNqBSURM169cWAKh7KQtWtbRkgrL8r4BduzZvHsIY8u9DpnS+KpU8YW6/Y2qyElYATuFqvzu4+eYXg8FBmtBNoY4zCSTk8m8ROldakX9LNlPihLP8P8ZkiXGyksakP8d38EHKKc9oTuIr9267bdcYK5g7KALkatmDJb1Qae/dralyoDlORMANVTlHdt8WOZ+dba/8LyIgcrrkGwwNfeqR7bd8I99b4LgcqTtpL+bI8m+tLlRei6ocrQnCT8uLrz0GoKH8++V9750PwgdalH+P9+AziESXfONqh//g4e03bz6egz+pADgyKwdama1DaEGVYwwgct9gFCXBzp2N5d++d4Eu+UoErk0c35HWioxWLq5dvXfbji8d78EHJvPw6DDk7o0bT3CSnqWsRfPbv+SqHOdy+fejDeXfDrLSCLXJ2IvTvm+Y3ctIDl+xd/vf/mM7DP7kRYB8Vs7ALlHGmyvONS//JhiXJA6+uqdR/o+iyH3g2mtLxOa4H1OTRx8yXWUjzj6o09r57TT4kwaAIyyd3UqlTSuqnCz8Mz8x/8ArP8MY8u9Z8aFFpPW7j9sxNdku5E6XfE1KJWzjPz+sfr78p9tvHQyCQLfL4E8aAOpe6kityHgQtST/hlJ3R1HkxpJ/O60uVL5Hk5z/pX6ugPJ9ZXxPw9k7BEPn7tmy/U+e3PJvMSoVdVxPFJfjwwFGqHJoGVvXNPCyDfQFFln+H6vRJKD68i+ahFfKkk0OGeP7WsAQ53YB+OLDN2z9HgAEO3fqaPVqbsdTxCccAPUNmWKnP6x9720uSZvdXl2gSHMtjonVrkb5H1HkzluzZtarwFktNZrGun420oL68fGKtDJak9bgJEnE2R+KUtv33LD1+3lMIGzaRNHq1W17YNaEA6CuylEwy6G0A1IrTVyXAEdaaxHZOziw/X/RQP4dRZE7XNKLSOvZ7DgFQVGL7k3ZyR0KRERak1IKpFTm+klcE+f+y0H+GWS+98gNNzw+4n50ROTQ5odlTzgAqptCB1SUO7D/YmO01r6vm2kBCLM2M7oQHzx4H5DJv0eSqTrQGPZj3sxZKj0UK9KqYRE5yq1fv+BkgTBDmIeE+XkwP80KeyDYBVG79ty09akRTSgVDA7SiO1l294mngMQJNg5qB47MPuz6dBhH6wEzG8dAUokrpESb+gnGbDyY2lGAi0ESKvvpLWhB4TJsSRvIgWMNU4aisVC1CF4eKnE6v9mzjn8fDW8rTb6CXsrFZ2fOcARppZNSiMoWh05AP8yvsAatY9JLqB4+IabHwDwwIQ9TKWism7jXahiBWcK4fYp69q1E4hxOQotAKJgJ7/uaVqVigoWDNJ4bqt1ZI4+DAVhyMPks4qpbpMGgHHJidGbqOymYBieNGsHUWhh7WUFAAoAFFYAoLACAIUVACisAEBhBQAKKwBQWAGAwgoAFFYAoLACAIUVACisAEBhBQAKKwBQWAGAwgoAFNZJdowmkCAMCBevpmMsF9CKQ4NFuQ1EoWR0uXzaov6+p9BgB285BjBT/e3QdMAAk196H8fxM28EABKiex3LqyDyG6WIjgPANBh/JSQC/hUpPDl6yMzwqBIDkL1bBzYWUbOzjUbsmkqL+tcfJKVmsXOHCBhs4aiTwqaGOQhOJ6VOFObYSJ7nldYzSeszOyKuF/YGdNBBRCBE2hDwKphZRJDvqFnYdCj/RYiIkv8HAYwQoyyFb50AAAAASUVORK5CYII=";
const MN_PROVINCES = [
  "Улаанбаатар",
  "Архангай",
  "Баян-Өлгий",
  "Баянхонгор",
  "Булган",
  "Говь-Алтай",
  "Говьсүмбэр",
  "Дорноговь",
  "Дорнод",
  "Дундговь",
  "Завхан",
  "Орхон",
  "Өвөрхангай",
  "Сэлэнгэ",
  "Сүхбаатар",
  "Төв",
  "Увс",
  "Ховд",
  "Хөвсгөл",
  "Хэнтий",
  "Дархан-Уул",
  "Өмнөговь",
];
let mnLocations = null;
let mnLocationsPromise = null;
function loadMnLocations() {
  if (mnLocations) return Promise.resolve(mnLocations);
  if (!mnLocationsPromise) {
    mnLocationsPromise = fetch("/static/tomuda/data/mn-locations.json", {
      cache: "force-cache",
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        mnLocations = data && typeof data === "object" ? data : {};
        return mnLocations;
      })
      .catch(() => {
        mnLocations = {};
        return mnLocations;
      });
  }
  return mnLocationsPromise;
}
function mnDistrictsForProvince(province) {
  if (!mnLocations || !province) return [];
  return Object.keys(mnLocations[province] || {}).sort((a, b) =>
    a.localeCompare(b, "mn"),
  );
}
const UB_DISTRICT_KHOROO_COUNTS = {
  Багахангай: 2,
  Багануур: 5,
  Баянгол: 34,
  Баянзүрх: 43,
  Чингэлтэй: 24,
  "Хан-Уул": 25,
  Налайх: 8,
  Сонгинохайрхан: 43,
  Сүхбаатар: 20,
};
function mnNumberedUnits(prefix, count) {
  if (!count || count < 1) return [];
  return Array.from({ length: count }, (_, i) => `${i + 1}-р ${prefix}`);
}
function mnKhoroosForUbDistrict(district) {
  const count = UB_DISTRICT_KHOROO_COUNTS[district];
  return count ? mnNumberedUnits("хороо", count) : [];
}
function mnSubsForDistrict(province, district) {
  if (province === "Улаанбаатар" && district) {
    const khoroos = mnKhoroosForUbDistrict(district);
    if (khoroos.length) return khoroos;
  }
  if (!mnLocations || !province || !district) return [];
  return mnLocations[province]?.[district] || [];
}
function customerLocationSelect(name, label, values, selected, opts = {}) {
  const { disabled = false, onchange = "", id = "" } = opts;
  const options = [`<option value="">Сонгох</option>`];
  const seen = new Set();
  if (selected && !values.includes(selected)) {
    options.push(
      `<option value="${esc(selected)}" selected>${esc(selected)}</option>`,
    );
    seen.add(selected);
  }
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    options.push(
      `<option value="${esc(value)}"${selected === value ? " selected" : ""}>${esc(value)}</option>`,
    );
  }
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><select name="${name}"${id ? ` id="${id}"` : ""} class="w-full px-4 py-3 bg-secondary rounded app-input"${disabled ? " disabled" : ""}${onchange ? ` onchange="${onchange}"` : ""}>${options.join("")}</select></label>`;
}
function customerDistrictFieldHtml(province, district = "") {
  const districts = mnDistrictsForProvince(province);
  return `<div id="customer-district-field">${customerLocationSelect("district", "Дүүрэг/Сум", districts, district, { onchange: "onCustomerDistrictChange()", disabled: !province })}</div>`;
}
function customerKhorooFieldLabel(province, district) {
  const subs = mnSubsForDistrict(province, district);
  if (!subs.length) return province === "Улаанбаатар" ? "Хороо" : "Баг";
  return subs[0].includes("баг") ? "Баг" : "Хороо";
}
function customerKhorooFieldHtml(province, district = "", khoroo = "") {
  const subs = mnSubsForDistrict(province, district);
  return `<div id="customer-khoroo-field">${customerLocationSelect("khoroo", customerKhorooFieldLabel(province, district), subs, khoroo, { disabled: !district })}</div>`;
}
function initCustomerAddressFields(c = {}) {
  const province =
    document.querySelector('[name="province"]')?.value ||
    c.province ||
    "Улаанбаатар";
  const district =
    document.querySelector('[name="district"]')?.value || c.district || "";
  const khoroo =
    document.querySelector('[name="khoroo"]')?.value || c.khoroo || "";
  const districtField = document.getElementById("customer-district-field");
  const khorooField = document.getElementById("customer-khoroo-field");
  if (districtField)
    districtField.outerHTML = customerDistrictFieldHtml(province, district);
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, district, khoroo);
}
function onCustomerProvinceChange() {
  const province = document.querySelector('[name="province"]')?.value || "";
  const districtField = document.getElementById("customer-district-field");
  const khorooField = document.getElementById("customer-khoroo-field");
  if (districtField)
    districtField.outerHTML = customerDistrictFieldHtml(province, "");
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, "", "");
}
function onCustomerDistrictChange() {
  const province = document.querySelector('[name="province"]')?.value || "";
  const district = document.querySelector('[name="district"]')?.value || "";
  const khorooField = document.getElementById("customer-khoroo-field");
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, district, "");
}
const persistKeys = [
  "customers",
  "products",
  "employees",
  "orders",
  "extraCategories",
  "inventoryLogs",
  "stockInReceipts",
  "deletionLog",
  "promotionDeletionLog",
  "countQty",
  "countDone",
  "countOpeningStock",
  "countSessionStartedAt",
  "workerCustomer",
  "orderEmployee",
  "paymentTerm",
  "settlementText",
  "promotionRules",
  "deliveryDate",
  "selectedDeliveryId",
  "deliveryName",
  "deliveryPhone",
  "settings",
];
let backendSaveFailedMessage = "";
let backendReady = false;
let backendSaveTimer = null;
let backendLastSaved = "";
let serverUpdatedAt = "";
let backendSaving = false;
let backendPollTimer = null;
let countRenderPending = false;
let countBlurSaveTimer = null;
let countFocusedProductId = "";
let countInputSyncing = false;
let warehouseDateRenderPending = false;
let warehouseDateBlurTimer = null;
let warehouseDatePickerActiveUntil = 0;
let receiptStatusSelectActiveUntil = 0;
let receiptStatusFilterPending = false;
let toolbarSelectActiveUntil = 0;
let toolbarSelectBlurTimer = null;
let toolbarSelectRenderPending = false;
let userScrollActiveUntil = 0;
let searchRenderTimer = null;
let promotionSaveLock = false;
let orderSubmitLock = false;
let stockInSaveLock = false;
let customerSaveLock = false;
let warehouseReceiptScrollId = "";
let whReceiptPickerDismissGuard = 0;
let whReceiptPickerSuppressDismissUntil = 0;
let whReceiptPickerSkipAnim = false;
let settlementRenderPending = false;
let settlementBlurTimer = null;
let loginFormActiveUntil = 0;
let loginFormGuardBound = false;
let tombudaHistoryDepth = 0;
let tombudaSkipPopstate = false;
let suppressHistoryPush = false;
const BACKEND_POLL_MS = 4000;
const BOOT_WAKE_MAX = 20;
const BOOT_WAKE_BASE_MS = 2500;
const BOOT_STATE_MAX = 5;
const BOOT_STATE_BASE_MS = 2000;
const BOOT_HEALTH_TIMEOUT_MS = 25000;
const BOOT_STATE_TIMEOUT_MS = 90000;
const LOCAL_BACKEND_CACHE_KEY = "tomuda-backend-cache";
const LOCAL_BACKEND_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_BACKEND_CACHE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_IMAGE_CHARS = 180000;
const PRODUCT_IMAGE_UPLOAD_MAX_BYTES = 150000;
let productImageCompressTask = null;
let customerImageCompressTask = null;
let employeeImageCompressTask = null;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const BOOT_TITLE_TEXT = "Апп нээгдэж байна";
const BOOT_LOADING_TEXT = "Мэдээлэл татаж байна. Түр хүлээнэ үү";
function setBootStatus(title, detail) {
  const titleEl = document.getElementById("boot-title");
  const detailEl = document.getElementById("boot-detail");
  if (titleEl) {
    titleEl.textContent = title || BOOT_TITLE_TEXT;
    titleEl.hidden = false;
  }
  if (detailEl) detailEl.textContent = detail || BOOT_LOADING_TEXT;
}
async function fetchJsonWithTimeout(url, ms = BOOT_HEALTH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
function wakeRetryDelayMs(attempt) {
  if (attempt < 2) return 1500;
  if (attempt < 5) return 2500;
  return BOOT_WAKE_BASE_MS + attempt * 400;
}
async function wakeBackendWithRetry() {
  for (let attempt = 0; attempt < BOOT_WAKE_MAX; attempt++) {
    setBootStatus(
      BOOT_TITLE_TEXT,
      attempt === 0
        ? "Сервер асаж байна. 1–2 минут хүлээгдэнэ..."
        : `Дахин холбогдож байна (${attempt + 1}/${BOOT_WAKE_MAX})...`,
    );
    try {
      const payload = await fetchJsonWithTimeout(
        `${API_BASE}/health`,
        BOOT_HEALTH_TIMEOUT_MS,
      );
      if (payload?.ok) return true;
    } catch (error) {
      console.warn("Backend wake failed", error, attempt + 1);
    }
    if (attempt < BOOT_WAKE_MAX - 1) {
      await sleep(wakeRetryDelayMs(attempt));
    }
  }
  return false;
}
async function fetchBackendStateWithRetry() {
  if (!(await wakeBackendWithRetry())) return null;
  for (let attempt = 0; attempt < BOOT_STATE_MAX; attempt++) {
    setBootStatus(
      BOOT_TITLE_TEXT,
      attempt === 0
        ? "Мэдээлэл татаж байна..."
        : `Мэдээлэл дахин татаж байна (${attempt + 1}/${BOOT_STATE_MAX})...`,
    );
    try {
      const payload = await fetchJsonWithTimeout(
        `${API_BASE}/state`,
        BOOT_STATE_TIMEOUT_MS,
      );
      if (payload?.state) return payload;
    } catch (error) {
      console.warn("Backend state load failed", error, attempt + 1);
    }
    if (attempt < BOOT_STATE_MAX - 1) {
      await sleep(BOOT_STATE_BASE_MS + attempt * 800);
    }
  }
  return null;
}
const fmt = (n) => "₮" + Number(n || 0).toLocaleString();
const fmtCountQty = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("mn-MN");
};
const fmtExcelMoney = (n) => `${Number(n || 0).toLocaleString("en-US")}₮`;
const RECEIPT_PERCENT_DISCOUNT = 3;
const RECEIPT_FONT = '"Arial", "Helvetica Neue", sans-serif';
const RECEIPT_FONT_TITLE = '"Times New Roman", "Times", serif';
const RECEIPT_FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap";
const RECEIPT_COMPANY_ADDRESS =
  "Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хороолол- 2 /13312/                                             Нийслэл хүрээ өргөн чөлөө 331-401. Утас: +976-75333357";
function receiptPartyFields(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sales = state.employees.find((e) => e.id === o.employeeId) || {},
    delivery = resolveOrderDelivery(o, receiptPrintDeliveryOpts()),
    paid = o.paymentTerm === "cash" || o.isPaid,
    bank = o.paymentTerm === "credit" && !o.isPaid,
    addr =
      [c.province, c.district, c.khoroo, c.address]
        .filter(Boolean)
        .join(", ") || "-";
  return {
    c,
    salesName: esc(o.employeeName || sales.name || "-"),
    salesPhone: esc(o.employeePhone || sales.phone || "-"),
    deliveryName: esc(delivery.deliveryName),
    deliveryPhone: esc(delivery.deliveryPhone),
    customerName: esc(c.name || o.customerName),
    customerReg: esc(c.registrationNumber || "-"),
    companyName: esc(c.companyName || "-"),
    customerPhone: esc(customerPhonesList(c).join(", ") || "-"),
    address: esc(addr),
    paid,
    bank,
  };
}
function receiptGridColgroup() {
  return `<colgroup><col class="receipt-grid__a"><col class="receipt-grid__b"><col class="receipt-grid__c"><col class="receipt-grid__d"><col class="receipt-grid__e"><col class="receipt-grid__f"><col class="receipt-grid__g"><col class="receipt-grid__h"><col class="receipt-grid__i"><col class="receipt-grid__j"><col class="receipt-grid__k"></colgroup>`;
}
function receiptDeliveryDateValue(o) {
  return orderDeliveryDay(o) || "";
}
function receiptPrintedDateValue() {
  return todayIso();
}
function receiptMetaRow(
  leftLabel,
  leftValue,
  rightLabel = "",
  rightValue = "",
) {
  return `<tr class="receipt-grid__meta"><td></td><td class="receipt-grid__label">${esc(leftLabel)}</td><td></td><td colspan="2" class="receipt-grid__value">${leftValue}</td><td colspan="3" class="receipt-grid__label">${esc(rightLabel)}</td><td colspan="3" class="receipt-grid__value">${rightValue}</td></tr>`;
}
function receiptInfoRows(o) {
  const f = receiptPartyFields(o);
  return `${receiptMetaRow("Худалдааны төлөөлөгч:", f.salesName, "Харилцагч:", f.customerName)}${receiptMetaRow("Худалдааны төлөөлөгчийн утас:", f.salesPhone, "Регистерийн дугаар:", f.customerReg)}${receiptMetaRow("Түгээгчийн нэр:", f.deliveryName, "Компаний нэр:", f.companyName)}${receiptMetaRow("Түгээгчийн утас:", f.deliveryPhone, "Утасны дугаар:", f.customerPhone)}<tr class="receipt-grid__spacer"><td colspan="11"></td></tr><tr class="receipt-grid__meta"><td></td><td colspan="2" class="receipt-grid__label">Дансны нэр:</td><td colspan="2" class="receipt-grid__value"><b>ТОМУДА групп</b></td><td colspan="3" class="receipt-grid__label">Хүргэлтийн хаяг:</td><td colspan="3"></td></tr><tr class="receipt-grid__meta"><td></td><td colspan="2" class="receipt-grid__label">Регистерийн дугаар:</td><td colspan="2" class="receipt-grid__value">5397987</td><td colspan="6" class="receipt-grid__value receipt-grid__value--address">${f.address}</td></tr><tr class="receipt-grid__meta"><td></td><td colspan="2" class="receipt-grid__label">Банкны нэр:</td><td colspan="2" class="receipt-grid__value">Хаан банк</td><td colspan="6"></td></tr><tr class="receipt-grid__meta"><td></td><td colspan="2" class="receipt-grid__label">Дансны дугаар:                     IBAN:      </td><td colspan="2" class="receipt-grid__value">60000500</td><td colspan="6"></td></tr><tr class="receipt-grid__meta"><td></td><td colspan="2"></td><td colspan="2" class="receipt-grid__value">5133333307</td><td colspan="6"></td></tr>`;
}
function receiptInfoSectionHtml(o) {
  return receiptInfoRows(o);
}
function receiptExcelInfoGridHtml(o) {
  return receiptInfoSectionHtml(o);
}
function receiptPaymentChecksHtml(paid, bank) {
  return {
    cash: `<span class="receipt-check">${paid ? "☑" : "☐"}</span> Бэлэн`,
    bank: `<span class="receipt-check">${bank ? "☑" : "☐"}</span> Зээлээр`,
  };
}
function receiptHeaderRows(logoSrc, o) {
  const deliveryDate = receiptDeliveryDateValue(o);
  const printedDate = receiptPrintedDateValue();
  return `<tr class="receipt-grid__header"><td rowspan="2" class="receipt-grid__logo-cell"><img src="${esc(logoSrc)}" alt="ТОМУДА" class="receipt-logo"></td><td colspan="5" class="receipt-grid__brand">ТОМУДА ГРУПП</td><td colspan="3" class="receipt-grid__date-label">Хүргэлтийн огноо:</td><td colspan="2" class="receipt-grid__date">${esc(deliveryDate)}</td></tr><tr class="receipt-grid__header"><td colspan="5" class="receipt-grid__address">${esc(RECEIPT_COMPANY_ADDRESS)}</td><td colspan="3" class="receipt-grid__date-label">Хэвлэсэн огноо:</td><td colspan="2" class="receipt-grid__date">${esc(printedDate)}</td></tr><tr class="receipt-grid__header"><td></td><td colspan="9" class="receipt-title">ЗАРЛАГЫН БАРИМТ №${formatReceiptNumber(o)}</td><td></td></tr>`;
}
function receiptHeaderHtml(logoSrc, o) {
  return `<table class="receipt-grid receipt-grid--sheet" role="presentation">${receiptGridColgroup()}${receiptHeaderRows(logoSrc, o)}</table>`;
}
/** Max paid lines alone on one A4 body (header/info already take space). */
const RECEIPT_PAGE_PAID_MAX = 26;
/** Soft capacity for paid + upper footer before promo/summary/signatures. */
const RECEIPT_PAGE_SOFT_MAX = 20;
function receiptPaidItems(o) {
  return (o.items || []).filter((i) => !i.isPromoFree);
}
function receiptPromoItems(o) {
  return (o.items || []).filter((i) => i.isPromoFree);
}
function receiptHasPromoSection(o) {
  return receiptPromoItems(o).length > 0 || !!receiptPromoSettleNote(o);
}
function receiptItemsHeadRow() {
  return `<tr class="receipt-items__head"><th class="receipt-items__num">№</th><th class="receipt-items__name">Барааны нэр</th><th class="receipt-items__unit">Хэмжих нэгж</th><th class="receipt-items__barcode">Баркод</th><th class="receipt-items__qty">Тоо/ш</th><th class="receipt-items__price">Нэгж үнэ</th><th class="receipt-items__total">Нийт үнэ</th></tr>`;
}
function receiptTableRowsHtml(o, items = receiptPaidItems(o), startIndex = 0) {
  return (items || [])
    .map((i, n) => {
      const p = productForReceiptLine(i);
      return `<tr class="receipt-items__row"><td class="receipt-items__num">${startIndex + n + 1}</td><td class="receipt-items__name">${esc(i.productName)}</td><td class="receipt-items__unit">${esc(p.unit || "ш")}</td><td class="receipt-items__barcode">${esc(p.barcode || "-")}</td><td class="receipt-items__qty">${i.quantity}</td><td class="receipt-items__price">${receiptMoney(resolveOrderItemUnitPrice(i))}</td><td class="receipt-items__total">${receiptMoney(resolveOrderItemLineTotal(i))}</td></tr>`;
    })
    .join("");
}
function receiptItemsBlockHtml(o, items, startIndex = 0, withHead = true) {
  const list = items || [];
  if (!withHead && !list.length) return "";
  const head = withHead ? receiptItemsHeadRow() : "";
  const body = receiptTableRowsHtml(o, list, startIndex);
  return `<tr class="receipt-grid__items-wrap"><td colspan="11" class="receipt-grid__items-cell"><table class="receipt-items" role="table">${head}${body}</table></td></tr>`;
}
function receiptTableHtml(o, opts = {}) {
  return receiptTableRowsHtml(o, opts.items, opts.startIndex || 0);
}
function productForReceiptLine(i) {
  if (!i) return {};
  const id = String(i.productId || "").trim();
  if (id) {
    const hit = state.products.find((x) => String(x.id) === id);
    if (hit) return hit;
  }
  const name = String(i.productName || "").trim();
  if (name) {
    const exact = state.products.find(
      (x) => String(x.name || "").trim() === name,
    );
    if (exact) return exact;
    const loose = state.products.find((x) => {
      const pn = String(x.name || "").trim();
      return pn && (pn.includes(name) || name.includes(pn));
    });
    if (loose) return loose;
  }
  return {};
}
function orderItemCatalogUnitPrice(item) {
  if (!item || item.isPromoFree) return 0;
  const p = productForReceiptLine(item);
  return Number(p.price ?? p.sellPrice ?? 0) || 0;
}
function resolveOrderItemUnitPrice(item) {
  if (!item || item.isPromoFree) return 0;
  const catalog = orderItemCatalogUnitPrice(item);
  if (catalog > 0) return catalog;
  const stored = Number(item.price);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const qty = Number(item.quantity) || 0;
  const total = Number(item.total);
  if (qty > 0 && Number.isFinite(total) && total > 0) return total / qty;
  return 0;
}
function resolveOrderItemLineTotal(item) {
  if (!item || item.isPromoFree) return 0;
  const qty = Number(item.quantity) || 0;
  const unit = resolveOrderItemUnitPrice(item);
  if (unit > 0 && qty > 0) return unit * qty;
  const total = Number(item.total);
  return Number.isFinite(total) ? total : 0;
}
function normalizeOrderItemPrices(o) {
  if (!o?.items) return false;
  let changed = false;
  for (const item of o.items) {
    if (item.isPromoFree) continue;
    const unit = resolveOrderItemUnitPrice(item);
    if (unit <= 0) continue;
    const qty = Number(item.quantity) || 0;
    const total = unit * qty;
    if (item.price !== unit || item.total !== total) {
      item.price = unit;
      item.total = total;
      changed = true;
    }
  }
  return changed;
}
function receiptPromoCatalogPrice(i) {
  const p = productForReceiptLine(i);
  return Number(p.price ?? p.sellPrice ?? 0) || 0;
}
function receiptPromoDisplayPrice(i) {
  if (!i) return 0;
  const stored = Number(i.catalogPrice);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const catalog = receiptPromoCatalogPrice(i);
  if (catalog) return catalog;
  const price = Number(i.price);
  return Number.isFinite(price) && price > 0 ? price : 0;
}
function receiptPromoDisplayTotal(i) {
  if (!i) return 0;
  const qty = Number(i.quantity) || 0;
  return qty * receiptPromoDisplayPrice(i);
}
function receiptPromoSettleNote(o) {
  const custom = String(o?.settlementText || "").trim();
  if (custom) return custom;
  const parts = settlementPartsFromSource(o);
  if (!parts) return "";
  return settlementNoteFromParts(parts, "тооцоо нийлнэ");
}
function enrichPromoLineForReceipt(line) {
  if (!line?.isPromoFree) return line;
  const catalog = receiptPromoCatalogPrice(line);
  if (!catalog) return line;
  return { ...line, catalogPrice: line.catalogPrice ?? catalog };
}
function receiptSettleNoteText(o) {
  const grossNotice =
    !o.applyPercentDiscount &&
    isCashPayment(o.paymentTerm) &&
    !orderInWarehouseLiveSession(o)
      ? `Тооцоог өдөртөө хийгээгүй тохиолдолд (${percentDiscountRate()}%) хөнгөлөлт хасагдахгүй болохыг анхаарна уу!!.`
      : "";
  return (
    receiptPromoSettleNote(o) ||
    grossNotice ||
    "Барааг хүлээн авсан өдөртөө тооцоог дуусгаагүй тохиолдолд хувь хасагдаагүй дүнгээр шилжүүлэхийг анхаарна уу!"
  );
}
function receiptPromoRowsHtml(o) {
  const promoItems = receiptPromoItems(o).map(enrichPromoLineForReceipt);
  const settleNote = receiptPromoSettleNote(o);
  if (!promoItems.length) return "";
  const banner = `<tr class="receipt-items__promo-note"><td colspan="7"><span class="receipt-items__promo-title">Урамшуулал</span>${settleNote ? ` <span class="receipt-items__promo-settle">${esc(settleNote)}</span>` : ""}</td></tr>`;
  const itemRows = promoItems
    .map((i) => {
      return `<tr class="receipt-items__promo"><td class="receipt-items__num"></td><td class="receipt-items__name">${esc(i.productName)}</td><td class="receipt-items__unit"></td><td class="receipt-items__barcode"></td><td class="receipt-items__qty">${i.quantity}</td><td class="receipt-items__price">${receiptMoney(receiptPromoDisplayPrice(i))}</td><td class="receipt-items__total">${receiptMoney(receiptPromoDisplayTotal(i))}</td></tr>`;
    })
    .join("");
  return `<tr class="receipt-grid__items-wrap"><td colspan="11" class="receipt-grid__items-cell"><table class="receipt-items receipt-items--promo" role="table"><colgroup><col class="receipt-items__num"><col class="receipt-items__name"><col class="receipt-items__unit"><col class="receipt-items__barcode"><col class="receipt-items__qty"><col class="receipt-items__price"><col class="receipt-items__total"></colgroup>${banner}${itemRows}</table></td></tr>`;
}
function receiptSummaryRowsHtml(sub, vat, payable, payTerm, o) {
  const grandNote = receiptGrandNote(o);
  const grandLabel = grandNote
    ? `Таны нийт төлөх дүн ${grandNote}`
    : "Таны нийт төлөх дүн";
  const summaryPart = [
    { label: "Бараа ажил үйлчилгээний дүн", value: receiptMoneyDetailed(sub) },
    { label: "НӨАТ", value: receiptMoneyDetailed(vat) },
    { label: grandLabel, value: receiptMoney(payable), grand: true },
  ]
    .map(({ label, value, grand }) => {
      const rowClass = [
        "receipt-grid__summary",
        grand ? "receipt-grid__summary--grand" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const valueClass = grand
        ? "receipt-grid__summary-value receipt-grid__summary-value--grand"
        : "receipt-grid__summary-value";
      return `<tr class="${rowClass}"><td></td><td colspan="9" class="receipt-grid__summary-label${grand ? " receipt-grid__summary-label--grand" : ""}">${esc(label)}</td><td class="${valueClass}">${value}</td></tr>`;
    })
    .join("");
  const settleRow = `<tr class="receipt-grid__settle"><td></td><td colspan="10" class="receipt-grid__settle-text">${esc(receiptSettleNoteText(o))}</td></tr>`;
  const payRow = `<tr class="receipt-grid__summary receipt-grid__summary--pay"><td></td><td colspan="9" class="receipt-grid__summary-label">Төлбөрийн нөхцөл</td><td class="receipt-grid__summary-value receipt-grid__summary-value--pay">${esc(payTerm)}</td></tr>`;
  return summaryPart + settleRow + payRow;
}
function receiptPaymentTermText(f, o) {
  if (f.bank || o.paymentTerm === "credit") return "Зээлээр";
  return "Шууд төлөлт";
}
function receiptShouldShowGross(o) {
  return true;
}
function receiptGrandNote(o) {
  const discount = orderDiscountAmount(o);
  const pct =
    o.applyPercentDiscount && isCashPayment(o.paymentTerm)
      ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
      : 0;
  if (pct) return `(Бэлэн төлөлтийн ${pct}% хасагдав)`;
  if (discount) return `(Хөнгөлөлт ${percentDiscountRate()}%)`;
  return "";
}
function receiptWarningRowsHtml() {
  return `<tr class="receipt-grid__warn"><td></td><td colspan="10" class="receipt-grid__warn-box"><p class="receipt-grid__warn-line">Эрхэм харилцагч та төлбөрөө заавал баримт дээрх компанийн дансанд шилжүүлж гүйлгээний утга дээр дэлгүүрийн нэр, ААН-ийн РЕГИСТР-ийг бичээрэй.</p><p class="receipt-grid__warn-line receipt-grid__warn-line--bold">Хувь хүний дансанд шилжүүлэхгүй байхыг анхаараарай.</p><p class="receipt-grid__warn-line">Өөр дансруу шилжүүлсэн төлбөрийг нийлүүлэгч компани хариуцахгүй болно</p><p class="receipt-grid__warn-line receipt-grid__warn-line--last">Барааг сайтар шалгаж тоо ширхэгийг тулгаж хүлээн авахыг анхаарна уу!</p></td></tr>`;
}
function receiptNoticeBoxHtml() {
  return receiptWarningRowsHtml();
}
function documentSignatureBlockHtml(opts = {}) {
  const padLeft = opts.padLeft !== false;
  const roleColspan = Number(opts.roleColspan) || 2;
  const lineColspan = Number(opts.lineColspan) || 7;
  const rowClass = esc(opts.rowClass || "doc-sign__row");
  const padCell = padLeft ? "<td></td>" : "";
  const totalCols = (padLeft ? 1 : 0) + roleColspan + 1 + lineColspan;
  const block = (role) =>
    `<tr class="${rowClass}">${padCell}<td colspan="${roleColspan}" rowspan="2" class="doc-sign__role">${esc(role)}</td><td class="doc-sign__hint">Нэр</td><td colspan="${lineColspan}" class="doc-sign__line"></td></tr><tr class="${rowClass}">${padCell}<td class="doc-sign__hint">Гарын үсэг</td><td colspan="${lineColspan}" class="doc-sign__line"></td></tr>`;
  return `<tr class="doc-sign__gap"><td colspan="${totalCols}"></td></tr>${block("Хүлээлгэн өгсөн:")}${block("Хүлээн авсан:")}`;
}
function receiptSignatureRowsHtml(opts = {}) {
  const pushDown = !!opts.pushDown;
  const fill = pushDown
    ? `<tr class="receipt-grid__fill"><td colspan="11"></td></tr>`
    : `<tr class="receipt-grid__spacer receipt-grid__spacer--sign"><td colspan="11"></td></tr>`;
  const gap = `<tr class="receipt-grid__spacer receipt-grid__spacer--sign"><td colspan="11"></td></tr>`;
  return `${fill}<tr class="receipt-grid__sign"><td></td><td colspan="4" class="receipt-grid__sign-label">Хүлээлгэн өгсөн ажилтны гарын үсэг:</td><td colspan="6" class="receipt-grid__sign-line"></td></tr>${gap}<tr class="receipt-grid__sign"><td></td><td colspan="4" class="receipt-grid__sign-label">Хүлээн авсан ажилтны гарын үсэг:</td><td colspan="6" class="receipt-grid__sign-line"></td></tr>`;
}
function stockInSignatureRowsHtml() {
  return documentSignatureBlockHtml({
    padLeft: false,
    roleColspan: 1,
    lineColspan: 5,
    rowClass: "doc-sign__row",
  });
}
function receiptUpperFooterRows(o) {
  const gross = orderGrossTotal(o);
  const grossRow = receiptShouldShowGross(o)
    ? `<tr class="receipt-grid__gross"><td></td><td colspan="9" class="receipt-grid__gross-label">Хувь хасагдаагүй нийт үнийн дүн</td><td class="receipt-grid__money receipt-grid__money--strong">${receiptMoney(gross)}</td></tr>`
    : "";
  return `<tr class="receipt-grid__return"><td></td><td colspan="2" class="receipt-grid__label">Буцаалтын тэмдэглэгээ:</td><td colspan="8"></td></tr>${grossRow}`;
}
function receiptLowerFooterRows(o, opts = {}) {
  const f = receiptPartyFields(o);
  const payable = orderPayableTotal(o);
  const sub = payable / 1.1;
  const vat = payable - sub;
  const payTerm = receiptPaymentTermText(f, o);
  return `${receiptPromoRowsHtml(o)}${receiptSummaryRowsHtml(sub, vat, payable, payTerm, o)}${receiptWarningRowsHtml()}${receiptSignatureRowsHtml(opts)}`;
}
function receiptFooterRows(o, opts = {}) {
  const mode = opts.footerMode || "full";
  if (mode === "none") return "";
  if (mode === "upper") return receiptUpperFooterRows(o);
  if (mode === "lower") return receiptLowerFooterRows(o, opts);
  return `${receiptUpperFooterRows(o)}${receiptLowerFooterRows(o, opts)}`;
}
function receiptTotalsBlockHtml(o) {
  return receiptFooterRows(o);
}
function receiptSheetHtml(o, logoSrc, opts = {}) {
  const items = opts.items || receiptPaidItems(o);
  const startIndex = opts.startIndex || 0;
  const withHeader = opts.withHeader !== false;
  const withInfo = opts.withInfo !== false;
  const withItemsHead = opts.withItemsHead !== false;
  let footerMode = opts.footerMode;
  if (!footerMode) {
    if (opts.withFooter === false) footerMode = "none";
    else footerMode = "full";
  }
  const rows = [
    withHeader ? receiptHeaderRows(logoSrc, o) : "",
    withInfo ? receiptInfoRows(o) : "",
    receiptItemsBlockHtml(o, items, startIndex, withItemsHead),
    receiptFooterRows(o, { footerMode, pushDown: opts.pushDown }),
  ].join("");
  return `<table class="receipt-grid receipt-grid--sheet" role="presentation">${receiptGridColgroup()}${rows}</table>`;
}
function receiptPageHtml(o, logoSrc) {
  return receiptSheetHtml(o, logoSrc);
}
function receiptPrintPageHtml(o, logoSrc) {
  const items = receiptPaidItems(o);
  const hasPromo = receiptHasPromoSection(o);
  const page = (html, continued = false, footerOnly = false) => {
    const cls = [
      "receipt-page",
      continued ? "receipt-page--continued" : "",
      footerOnly ? "receipt-page--footer-only" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<div class="${cls}">${html}</div>`;
  };
  const wrapLower = () =>
    page(
      receiptSheetHtml(o, logoSrc, {
        items: [],
        withHeader: false,
        withInfo: false,
        withItemsHead: false,
        footerMode: "lower",
        pushDown: true,
      }),
      true,
      true,
    );

  // Prefer keeping all paid lines on page 1; if crowded, cut from promo downward.
  if (items.length <= RECEIPT_PAGE_PAID_MAX) {
    if (hasPromo && items.length >= RECEIPT_PAGE_SOFT_MAX) {
      return (
        page(
          receiptSheetHtml(o, logoSrc, {
            items,
            footerMode: "upper",
          }),
        ) + wrapLower()
      );
    }
    return page(receiptSheetHtml(o, logoSrc));
  }

  // Paid list alone overflows: fill pages with paid lines; promo+below only after last paid chunk.
  const parts = [];
  for (let i = 0; i < items.length; i += RECEIPT_PAGE_PAID_MAX) {
    const chunk = items.slice(i, i + RECEIPT_PAGE_PAID_MAX);
    const isLast = i + RECEIPT_PAGE_PAID_MAX >= items.length;
    const continued = i > 0;
    if (!isLast) {
      parts.push(
        page(
          receiptSheetHtml(o, logoSrc, {
            items: chunk,
            startIndex: i,
            withHeader: !continued,
            withInfo: !continued,
            withItemsHead: true,
            footerMode: "none",
          }),
          continued,
        ),
      );
      continue;
    }
    if (hasPromo && chunk.length >= RECEIPT_PAGE_SOFT_MAX) {
      parts.push(
        page(
          receiptSheetHtml(o, logoSrc, {
            items: chunk,
            startIndex: i,
            withHeader: !continued,
            withInfo: !continued,
            footerMode: "upper",
          }),
          continued,
        ),
      );
      parts.push(wrapLower());
    } else {
      parts.push(
        page(
          receiptSheetHtml(o, logoSrc, {
            items: chunk,
            startIndex: i,
            withHeader: !continued,
            withInfo: !continued,
            footerMode: "full",
            pushDown: continued && chunk.length < 8,
          }),
          continued,
        ),
      );
    }
  }
  return parts.join("");
}
function ensureSettings() {
  if (!state.settings || typeof state.settings !== "object") {
    state.settings = {
      stockAlertEnabled: true,
      stockAlertMin: 10,
      percentDiscountRate: RECEIPT_PERCENT_DISCOUNT,
    };
    return;
  }
  if (state.settings.stockAlertEnabled == null)
    state.settings.stockAlertEnabled = true;
  if (state.settings.stockAlertMin == null) state.settings.stockAlertMin = 10;
  if (state.settings.percentDiscountRate == null)
    state.settings.percentDiscountRate = RECEIPT_PERCENT_DISCOUNT;
  if (state.settings.orderRetentionDays == null)
    state.settings.orderRetentionDays = 30;
}
function percentDiscountRate() {
  ensureSettings();
  const n = Number(state.settings.percentDiscountRate);
  return Number.isFinite(n) && n >= 0 ? n : RECEIPT_PERCENT_DISCOUNT;
}
function canApplyPercentDiscount(emp = state.currentEmployee) {
  if (!emp) return false;
  if (emp.role === "admin") return percentDiscountRate() > 0;
  if (emp.role !== "sales") return false;
  if (emp.allowPercentDiscount === false) return false;
  if (emp.allowPercentDiscount == null) return percentDiscountRate() > 0;
  return !!emp.allowPercentDiscount && percentDiscountRate() > 0;
}
function isCashPayment(term = state.paymentTerm) {
  return (term || "cash") === "cash";
}
function workerPercentDiscountActive(term = state.paymentTerm) {
  return (
    !!state.applyPercentDiscount &&
    canApplyPercentDiscount() &&
    isCashPayment(term)
  );
}
function ensureEmployeePercentDiscount() {
  state.employees.forEach((e) => {
    if (e.role === "sales" && e.allowPercentDiscount == null)
      e.allowPercentDiscount = true;
  });
}
function stockAlertLevel(p) {
  return Math.max(0, Number(p?.minStock ?? 0));
}
function isLowStock(p) {
  if (state.settings?.stockAlertEnabled === false) return false;
  const limit = stockAlertLevel(p);
  if (limit <= 0) return false;
  return Number(p?.stock ?? 0) <= limit;
}
function lowStockProducts() {
  return state.products.filter(isLowStock);
}
const dte = (d) => new Date(d).toLocaleDateString("mn-MN");
const dteAt = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  const hh = String(x.getHours()).padStart(2, "0");
  const mm = String(x.getMinutes()).padStart(2, "0");
  return `${dte(d)} ${hh}:${mm}`;
};
const isoDay = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
function normalizeIsoDateInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === mo - 1 &&
      dt.getDate() === d
    ) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    return "";
  }
  return isoDay(text);
}
const todayIso = () => isoDay(new Date());
const isDayBeforeToday = (day) => !!(day && day < todayIso());
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDay(d);
};
function defaultDeliveryDate(from) {
  const base = new Date(from || Date.now());
  if (Number.isNaN(base.getTime())) return tomorrowIso();
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  return isoDay(d);
}
function orderDeliveryDay(o) {
  const stored = isoDay(o?.deliveryDate);
  if (stored) return stored;
  const created = isoDay(o?.createdAt);
  return created || todayIso();
}
const orderDay = (o) => orderDeliveryDay(o);
function todayNoonLocal() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}
function orderInWarehouseLiveSession(o) {
  const today = todayIso();
  if (isoDay(o.createdAt) === today) return true;
  return orderDay(o) === today;
}
function orderMatchesWarehouseDate(o, day = state.filters.warehouseDate) {
  const targetDay = normalizeIsoDateInput(day) || todayIso();
  // Warehouse/receipt date filters should follow delivery day shown on receipts.
  return normalizeIsoDateInput(orderDay(o)) === targetDay;
}
function filterWarehouseOrders(orders) {
  return orders.filter((o) => orderMatchesWarehouseDate(o));
}
const mapsLink = (lat, lng) =>
  lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
    ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
    : "";
const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
function receiptMonthKey(o) {
  const day = isoDay(o?.createdAt || o?.deliveryDate || "");
  return day ? day.slice(0, 7) : "";
}
function orderReceiptNum(o) {
  if (!o) return "";
  const seq = Number(o.receiptSeq);
  if (seq > 0) return seq;
  return o.id;
}
function formatReceiptNumber(o) {
  const day = isoDay(o?.createdAt || o?.deliveryDate || "");
  const seq = Number(o?.receiptSeq);
  if (day) {
    const [y, m, d] = day.split("-");
    const base = `${String(y).slice(-2)}${m}-${d}`;
    if (seq > 0) return `${base}-${seq}`;
    return base;
  }
  return String(orderReceiptNum(o));
}
function receiptMoney(n) {
  return Number(n || 0).toLocaleString();
}
function receiptMoneyDetailed(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
function orderGrossTotal(o) {
  const live = orderGrossFromItems(o);
  if (o.grossTotal != null) {
    const cached = Number(o.grossTotal);
    if (Number.isFinite(cached) && Math.abs(cached - live) < 0.01)
      return cached;
  }
  return live;
}
function orderDiscountAmount(o) {
  if (o.discountAmount != null) return Number(o.discountAmount);
  const gross = orderGrossTotal(o);
  const pct =
    o.applyPercentDiscount && isCashPayment(o.paymentTerm)
      ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
      : 0;
  return Math.round((gross * pct) / 100);
}
function orderPayableTotal(o) {
  return orderAmount(o);
}
function orderGrossFromItems(o) {
  return (o.items || [])
    .filter((i) => !i.isPromoFree)
    .reduce((s, i) => s + resolveOrderItemLineTotal(i), 0);
}
function recalcOrderTotals(o) {
  if (!o) return o;
  const gross = orderGrossFromItems(o);
  const pctRate =
    o.applyPercentDiscount && isCashPayment(o.paymentTerm)
      ? Number(o.percentDiscount ?? percentDiscountRate())
      : 0;
  const employeeDiscount =
    pctRate > 0 ? Math.round((gross * pctRate) / 100) : 0;
  const term = o.paymentTerm || "cash";
  const priceRule = matchingPricePromotionRule(gross);
  const paymentRule = matchingPaymentPromotionRule(gross, term);
  const pricePromoDiscount = pricePromotionDiscountAmount(gross, priceRule);
  const paymentPromoDiscount = paymentPromotionDiscountAmount(
    gross,
    paymentRule,
  );
  const discountAmount = Math.min(
    gross,
    employeeDiscount + pricePromoDiscount + paymentPromoDiscount,
  );
  o.grossTotal = gross;
  o.discountAmount = discountAmount;
  o.total = gross - discountAmount;
  return o;
}
function orderAmount(o) {
  if (!o) return 0;
  const liveGross = orderGrossFromItems(o);
  const cachedGross = o.grossTotal != null ? Number(o.grossTotal) : null;
  const stored = Number(o.total);
  if (
    Number.isFinite(stored) &&
    (cachedGross == null || Math.abs(cachedGross - liveGross) < 0.01)
  ) {
    return stored;
  }
  recalcOrderTotals(o);
  return Number(o.total) || 0;
}
function orderCreatedDay(o) {
  const created = isoDay(o?.createdAt);
  if (created) return created;
  return orderDeliveryDay(o);
}
function orderRetentionDays() {
  ensureSettings();
  const n = Number(state.settings.orderRetentionDays);
  return Number.isFinite(n) && n >= 7 ? Math.min(Math.floor(n), 365) : 30;
}
function orderRetentionExpiresAt(o) {
  const day = orderCreatedDay(o);
  if (!day) return 0;
  const expires = new Date(`${day}T23:59:59`);
  if (Number.isNaN(expires.getTime())) return 0;
  expires.setDate(expires.getDate() + orderRetentionDays());
  return expires.getTime();
}
function orderWithinRetention(o, now = Date.now()) {
  const expires = orderRetentionExpiresAt(o);
  return !expires || expires >= now;
}
function retainedOrders(orders = [], now = Date.now()) {
  return (orders || []).filter((o) => orderWithinRetention(o, now));
}
function settlementNoteText(o) {
  const custom = String(o?.settlementText || "").trim();
  if (custom) return custom;
  const parts = settlementPartsFromSource(o);
  if (!parts) return "";
  return settlementNoteFromParts(parts, "тооцоо нийлэхээр тохиролцов");
}
function settlementTextForInput(source = state) {
  return String(source?.settlementText ?? "");
}
function settlementTextInputValue(source = state) {
  return settlementTextForInput(source).trim();
}
function normalizeSettlementTextDraft() {
  if (!state.settlementAgreed) state.settlementText = "";
}
function applySettlementTextInput(value) {
  state.settlementAgreed = true;
  state.settlementText = String(value ?? "");
}
function growSettlementInput(el) {
  if (!el) return;
  el.style.height = "0px";
  const min = 30;
  const max = 120;
  const next = Math.min(max, Math.max(min, el.scrollHeight));
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
}
function syncSettlementInputHeights(root = document) {
  root.querySelectorAll("[data-settlement-input]").forEach(growSettlementInput);
}
function settlementInputFocus() {
  clearTimeout(settlementBlurTimer);
}
function settlementInputBlur() {
  clearTimeout(settlementBlurTimer);
  settlementBlurTimer = setTimeout(flushPendingSettlementRender, 150);
  scheduleBackendSave();
}
function flushPendingSettlementRender() {
  if (isEditingSettlementText()) return;
  if (!settlementRenderPending) return;
  settlementRenderPending = false;
  render();
}
function receiptGrossPercentNoticeHtml(o) {
  if (!o || o.applyPercentDiscount || !isCashPayment(o.paymentTerm)) return "";
  if (orderInWarehouseLiveSession(o)) return "";
  const rate = percentDiscountRate();
  return `<div class="receipt-gross-note">Тооцоог өдөртөө хийгээгүй тохиолдолд (${rate}%) хөнгөлөлт хасагдахгүй болохыг анхаарна уу!!.</div>`;
}
function daysInSettlementMonth(month, year = new Date().getFullYear()) {
  const m = Math.floor(Number(month) || 0);
  if (m < 1 || m > 12) return 31;
  return new Date(year, m, 0).getDate();
}
function parseSettlementMonth(raw) {
  const n = Math.floor(Number(String(raw ?? "").trim()) || 0);
  return n >= 1 && n <= 12 ? n : 0;
}
function parseSettlementDay(raw, month) {
  const m = parseSettlementMonth(month);
  if (!m) return 0;
  const max = daysInSettlementMonth(m);
  const n = Math.floor(Number(String(raw ?? "").trim()) || 0);
  return n >= 1 && n <= max ? n : 0;
}
function settlementPartsFromSource(source) {
  if (!source?.settlementAgreed) return null;
  const month = parseSettlementMonth(source.settlementMonth);
  const day = parseSettlementDay(source.settlementDay, month);
  if (!month || !day) return null;
  return { month, day };
}
function settlementNoteFromParts(
  parts,
  suffix = "тооцоо нийлэхээр тохиролцов",
) {
  if (!parts) return "";
  return `${parts.month} сарын ${parts.day}-ны дотор ${suffix}`;
}
function settlementDateIsoFromParts(parts, year = new Date().getFullYear()) {
  if (!parts) return "";
  return `${year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function settlementPartsFromIso(iso) {
  const text = String(iso || "").trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = parseSettlementMonth(Number(m[2]));
  const day = parseSettlementDay(Number(m[3]), month);
  if (!month || !day) return null;
  return { month, day };
}
function normalizeSettlementDraft() {
  if (!state.settlementAgreed) {
    state.settlementMonth = "";
    state.settlementDay = "";
    return;
  }
  const parts = settlementPartsFromSource(state);
  if (!parts) {
    const now = new Date();
    state.settlementMonth = String(now.getMonth() + 1);
    state.settlementDay = String(now.getDate());
    return;
  }
  state.settlementMonth = String(parts.month);
  state.settlementDay = String(parts.day);
}
function applySettlementDateInput(iso) {
  const parts = settlementPartsFromIso(iso);
  if (!parts) return;
  state.settlementAgreed = true;
  state.settlementMonth = String(parts.month);
  state.settlementDay = String(parts.day);
  render();
}
function settlementDateInputValue() {
  const parts =
    settlementPartsFromSource(state) ||
    (() => {
      const now = new Date();
      return { month: now.getMonth() + 1, day: now.getDate() };
    })();
  return settlementDateIsoFromParts(parts);
}
function nextReceiptSeq(month) {
  let max = 0;
  for (const o of state.orders) {
    const m = o.receiptMonth || receiptMonthKey(o);
    if (m !== month) continue;
    const seq = Number(o.receiptSeq);
    if (seq > max) max = seq;
  }
  return max + 1;
}
function paidFromPaymentTerm(term) {
  return term === "cash";
}
function paymentTermLabel(term) {
  return term === "credit" ? "Зээлээр" : "Бэлнээр";
}
function orderIsPaid(o) {
  if (!o) return false;
  if (o.paymentTerm === "cash") return true;
  if (o.paymentTerm === "credit") return !!o.isPaid;
  return !!o.isPaid;
}
function customerUnpaidOrders(customerId) {
  if (!customerId) return [];
  return retainedOrders(state.orders || [])
    .filter((o) => o.customerId === customerId && !orderIsPaid(o))
    .sort(compareOrdersNewestFirst);
}
function customerReceivableTotal(customerId) {
  return customerUnpaidOrders(customerId).reduce(
    (sum, o) => sum + orderAmount(o),
    0,
  );
}
function customerEditReceivableSectionHtml(customerId) {
  const orders = customerUnpaidOrders(customerId);
  if (!orders.length) return "";
  const total = customerReceivableTotal(customerId);
  const list = workerReceivableHtml(customerId, { withPayActions: true });
  return `<div class="customer-edit-receivable rounded-lg border border-border bg-secondary/40 p-4 space-y-3" data-customer-receivable><div class="flex items-center justify-between gap-3"><div><p class="text-sm font-semibold m-0">Тооцоо</p><p class="text-xs text-muted-foreground m-0 mt-0.5">${orders.length} баримт · төлөөгүй</p></div><p class="text-base font-bold text-tone-danger m-0">${fmt(total)}</p></div>${list}</div>`;
}
function refreshCustomerEditReceivable(customerId) {
  const form = modal.querySelector("form[data-customer-form]");
  if (!form || form.dataset.customerId !== String(customerId || "")) return;
  const host = form.querySelector("[data-customer-receivable-host]");
  if (!host) return;
  host.innerHTML = customerEditReceivableSectionHtml(customerId);
}
function workerReceivableItemHtml(o, opts = {}) {
  const { actions = "" } = opts;
  return `<div class="worker-receivable__item"><span class="worker-receivable__no">${receiptNo(o, "xs")}</span><span class="worker-receivable__amount">${fmt(orderAmount(o))}</span>${actions}</div>`;
}
function workerReceivableHtml(customerId, opts = {}) {
  const orders = customerUnpaidOrders(customerId);
  if (!orders.length) return "";
  const items = orders
    .map((o) => {
      const actions =
        opts.withPayActions && !orderIsPaid(o)
          ? `<button type="button" onclick="confirmSetPaid('${esc(o.id)}')" class="btn btn--primary btn--sm worker-receivable__action">Тооцоо дууссан</button>`
          : "";
      return workerReceivableItemHtml(o, { actions });
    })
    .join("");
  return `<div class="worker-receivable"><p class="worker-receivable__label">Авлага</p><div class="worker-receivable__list">${items}</div></div>`;
}
function reportCustomerReceivableRow(customerName, unpaidOrders) {
  const first = unpaidOrders[0] || {},
    term = paymentTermLabel(first.paymentTerm),
    items = unpaidOrders
      .map((o) => {
        return workerReceivableItemHtml(o, {
          actions: `<button type="button" onclick="confirmSetPaid('${esc(o.id)}')" class="btn btn--primary btn--sm worker-receivable__action">Тооцоо дууссан</button>`,
        });
      })
      .join("");
  return `<div class="line-list__row line-list__row--static report-receivable-row"><div class="report-receivable-row__main"><p class="payment-row__customer">${esc(customerName)}</p><div class="worker-receivable"><p class="worker-receivable__label">Авлага</p><div class="worker-receivable__list">${items}</div></div><p class="line-list__meta">${esc(first.employeeName || "-")} · ${term} · Хүргэлт ${dte(orderDeliveryDay(first))}</p></div></div>`;
}
function reportPaymentListHtml(orders, emptyText = "Захиалга байхгүй") {
  if (!orders.length)
    return `<div class="line-panel__empty">${esc(emptyText)}</div>`;
  // One row per order so credit unpaid always shows «Тооцоо дууссан».
  return orders.map((o) => paymentRow(o)).join("");
}
function normalizeOrderPayments() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    if (!o.paymentTerm) o.paymentTerm = "cash";
    if (o.paymentTerm === "cash") o.isPaid = true;
    else if (o.paymentTerm === "credit") o.isPaid = !!o.isPaid;
  }
}
function normalizeOrderDeliveryDates() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    if (!isoDay(o.deliveryDate))
      o.deliveryDate = isoDay(o.createdAt) || todayIso();
  }
}
function normalizeOrderTotals() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    const itemsChanged = normalizeOrderItemPrices(o);
    const liveGross = orderGrossFromItems(o);
    const cachedGross = o.grossTotal != null ? Number(o.grossTotal) : null;
    if (
      itemsChanged ||
      !Number.isFinite(Number(o.total)) ||
      (cachedGross != null && Math.abs(cachedGross - liveGross) > 0.01)
    ) {
      recalcOrderTotals(o);
    }
  }
}
function normalizeOrderReceiptNumbers() {
  if (!Array.isArray(state.orders)) return;
  const sorted = [...state.orders].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const maxByMonth = {};
  const usedByMonth = {};
  const claimed = new Map();

  for (const o of sorted) {
    const month = receiptMonthKey(o);
    if (!month) continue;
    o.receiptMonth = month;
    if (!usedByMonth[month]) usedByMonth[month] = new Set();
    const seq = Number(o.receiptSeq);
    if (seq > 0 && !usedByMonth[month].has(seq)) {
      usedByMonth[month].add(seq);
      claimed.set(o.id, seq);
      maxByMonth[month] = Math.max(maxByMonth[month] || 0, seq);
    }
  }

  for (const o of sorted) {
    const month = receiptMonthKey(o);
    if (!month) continue;
    if (claimed.has(o.id)) {
      o.receiptSeq = claimed.get(o.id);
      continue;
    }
    maxByMonth[month] = (maxByMonth[month] || 0) + 1;
    o.receiptSeq = maxByMonth[month];
    if (!usedByMonth[month]) usedByMonth[month] = new Set();
    usedByMonth[month].add(o.receiptSeq);
  }
}
function nextOrderId() {
  let max = 0;
  for (const o of state.orders || []) {
    const raw = String(o?.id || "");
    const n = Number(raw);
    if (Number.isFinite(n) && n > max) max = n;
  }
  let next = max + 1;
  while ((state.orders || []).some((o) => String(o?.id) === String(next))) {
    next += 1;
  }
  return String(next);
}
function buildNewOrder(fields) {
  const createdAt = fields.createdAt || new Date().toISOString();
  const receiptMonth = receiptMonthKey({ createdAt });
  const created = isoDay(createdAt);
  const stored = isoDay(fields.deliveryDate);
  const deliveryDate = stored ? fields.deliveryDate : created || todayIso();
  return {
    id: nextOrderId(),
    receiptMonth,
    receiptSeq: nextReceiptSeq(receiptMonth),
    createdAt,
    ...fields,
    deliveryDate,
  };
}
function receiptNo(order, size = "md") {
  const n =
    typeof order === "object" && order !== null
      ? formatReceiptNumber(order)
      : order;
  return `<span class="receipt-no receipt-no--${size}">№${esc(String(n))}</span>`;
}
const pickerOpen = () => !!modal.querySelector("[data-picker-root]");
const ORDER_PICKER_TITLE = "Захиалгад бараа сонгох";
const PRODUCT_NEW_TITLE = "Бараа нэмэх";
const PRODUCT_EDIT_TITLE = "Бараа засах";
const EXCEL_FILE_DOWNLOAD = "Мэдээлэл татах";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const IMPORT_FILE_FORMAT_HINT =
  "Файлын формат .xlsx байх ёстой. «Формат татах» товчоор татсан .xlsx загвар ашиглана уу. 2-р мөр жишээ — өөрийн мэдээллээ 2-р мөр эсвэл доош нь оруулна уу.";
function excelIconHtml() {
  return `<svg class="ui-icon page-toolbar__excel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`;
}
function importUploadIconHtml() {
  return `<svg class="ui-icon page-toolbar__excel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 19h16a2 2 0 0 0 2-2v-1H2v1a2 2 0 0 0 2 2z"/></svg>`;
}
function excelDownloadBtn(onclick, opts = {}) {
  const {
    label = EXCEL_FILE_DOWNLOAD,
    shortLabel = EXCEL_FILE_DOWNLOAD,
    disabled = false,
    extraClass = "",
  } = opts;
  return `<button type="button" onclick="${onclick}" class="btn btn--toolbar btn--toolbar-excel ${extraClass}"${disabled ? " disabled" : ""} aria-label="${esc(label)}">${excelIconHtml()}<span class="btn--toolbar__label btn--toolbar__label--full">${esc(label)}</span><span class="btn--toolbar__label btn--toolbar__label--short">${esc(shortLabel)}</span></button>`;
}
function excelImportToolbar(kind) {
  if (!canImportExcel() && !canDownloadExcelTemplate()) return "";
  const canImport = canImportExcel();
  const canTemplate = canDownloadExcelTemplate();
  ensureGlobalImportFileInputs();
  const label = kind === "customers" ? "Харилцагч" : "Бараа";
  const inputId = `import-file-${kind}`;
  const templateBtn = canTemplate
    ? `<button type="button" data-import-download="${esc(kind)}" class="btn btn--toolbar btn--toolbar-excel excel-import-toolbar__btn" aria-label="Формат татах">${excelIconHtml()}<span class="excel-import-toolbar__label">Формат татах</span></button>`
    : "";
  const uploadBtn = canImport
    ? `<label for="${inputId}" data-import-upload="${esc(kind)}" class="btn btn--toolbar btn--toolbar-secondary excel-import-toolbar__btn excel-import-toolbar__upload" aria-label="Excel оруулах">${importUploadIconHtml()}<span class="excel-import-toolbar__label">Excel оруулах</span></label>`
    : "";
  return `<div class="excel-import-toolbar" data-import-kind="${esc(kind)}" data-import-dropzone="${esc(kind)}" role="group" aria-label="${esc(label)} Excel импорт">${templateBtn}${uploadBtn}</div>`;
}
let importLoading = false;
const IMPORT_FILE_ACCEPT =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
function ensureGlobalImportFileInputs() {
  let host = document.getElementById("import-file-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "import-file-host";
    host.className = "import-file-host";
    document.body.appendChild(host);
  }
  for (const kind of ["products", "customers"]) {
    const inputId = `import-file-${kind}`;
    let input = document.getElementById(inputId);
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = inputId;
      input.accept = IMPORT_FILE_ACCEPT;
      input.className = "import-file-host__input";
      input.setAttribute("data-import-file", kind);
      input.setAttribute("aria-label", `${importKindLabel(kind)} Excel upload`);
      host.appendChild(input);
    }
  }
}
function csrfTokenFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
function importUploadFilename(file, kind) {
  const raw = String(file?.name || "").trim();
  if (/\.(xlsx|xls)$/i.test(raw)) return raw;
  const base =
    raw.replace(/\.[^.]+$/, "") ||
    (kind === "customers" ? "hariltsagch" : "baraa");
  return `${base}.xlsx`;
}
async function importFileLooksLikeExcel(file) {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return true;
  const type = String(file.type || "").toLowerCase();
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return true;
  }
  try {
    const head = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(head);
    if (bytes.length >= 2 && bytes[0] === 0xd0 && bytes[1] === 0xcf)
      return true;
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b)
      return true;
  } catch {
    /* ignore */
  }
  return false;
}
function setImportLoading(active, message = "Excel импорт хийж байна...") {
  importLoading = !!active;
  let overlay = document.getElementById("importLoadingOverlay");
  if (!active) {
    overlay?.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "importLoadingOverlay";
    overlay.className = "import-loading-overlay";
    overlay.innerHTML = `<div class="import-loading-overlay__card" role="status" aria-live="polite"><span class="import-loading-overlay__spinner" aria-hidden="true"></span><p class="import-loading-overlay__text"></p></div>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector(".import-loading-overlay__text").textContent = message;
}
function showAppToast(message, type = "success") {
  document.querySelector(".app-toast")?.remove();
  const el = document.createElement("div");
  el.className = `app-toast app-toast--${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("app-toast--visible"));
  setTimeout(() => {
    el.classList.remove("app-toast--visible");
    setTimeout(() => el.remove(), 220);
  }, 3200);
}
function importActorPayload() {
  return state.currentEmployee
    ? JSON.stringify({
        id: state.currentEmployee.id,
        email: state.currentEmployee.email,
      })
    : "";
}
function importTemplatePath(kind) {
  return kind === "customers"
    ? "/import/customers/template"
    : "/import/products/template";
}
function importTemplateFilename(kind) {
  return kind === "customers" ? "hariltsagch-format.xlsx" : "baraa-format.xlsx";
}
function importApiPath(kind) {
  return kind === "customers" ? "/import/customers" : "/import/products";
}
function importKindLabel(kind) {
  return kind === "customers" ? "Харилцагч" : "Бараа";
}
function importFileInput(kind) {
  ensureGlobalImportFileInputs();
  return document.getElementById(`import-file-${kind}`);
}
async function downloadImportTemplate(kind) {
  if (!canDownloadExcelTemplate())
    return alertModal("Эрхгүй", "Формат татах эрхгүй.");
  const path = importTemplatePath(kind);
  const filename = importTemplateFilename(kind);
  const url = new URL(`${API_BASE}${path}`, appBackendOrigin()).href;
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error(`template failed (${res.status})`);
    const blob = await res.blob();
    await downloadBlobFile(new Blob([blob], { type: XLSX_MIME }), filename, {
      skipShare: true,
    });
    showAppToast(`${importKindLabel(kind)} формат татагдлаа`, "success");
  } catch (error) {
    console.warn("Import template download failed", error);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAppToast(`${importKindLabel(kind)} формат татагдлаа`, "success");
    } catch (fallbackError) {
      console.warn("Import template fallback download failed", fallbackError);
      alertModal(
        "Алдаа",
        `${importKindLabel(kind)} формат файл татахад алдаа гарлаа. Дахин оролдоно уу.`,
      );
    }
  }
}
function importApiDetail(payload, fallback = "Импорт амжилтгүй") {
  const detail = payload?.detail ?? payload?.message;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return String(first.msg);
  }
  return fallback;
}
function importReportHint(report = {}) {
  if ((report.total || 0) <= 0) {
    return " — Excel-д өгөгдөлтэй мөр олдсонгүй";
  }
  const first = (report.errors || [])[0];
  if (!first?.message) return "";
  return ` (${first.message}, мөр ${first.row || "?"})`;
}
async function waitForBackendSaveIdle() {
  while (backendSaving) await sleep(50);
}
function showImportReportModal(report, kind) {
  const label = kind === "customers" ? "Харилцагч" : "Бараа";
  const created = Number(report.created || 0);
  const updated = Number(report.updated || 0);
  const imageSuccess = Number(report.imageSuccess || 0);
  const imageSkipped = Number(report.imageSkipped || 0);
  const errors = (report.errors || [])
    .map(
      (item) =>
        `<li><b>Мөр ${item.row}</b> → ${esc(item.message || "Алдаа")}</li>`,
    )
    .join("");
  let summary = "";
  if ((report.total || 0) <= 0) {
    summary = `<p class="import-report__empty">Excel-д өгөгдөлтэй мөр олдсонгүй. ${esc(IMPORT_FILE_FORMAT_HINT)} 2-р мөрөөс мэдээлэл оруулна уу.</p>`;
  } else if ((report.success || 0) <= 0) {
    summary = `<p class="import-report__empty">Нэг ч мөр импортлогдсонгүй. Доорх алдааг шалгана уу.</p>`;
  } else if ((report.failed || 0) > 0) {
    summary = `<p class="import-report__empty">${report.success || 0} мөр хадгалагдлаа. ${report.failed || 0} мөрийг боловсруулж чадсангүй.</p>`;
  } else if (imageSkipped > 0) {
    summary = `<p class="import-report__empty">Бараанууд хадгалагдлаа. ${imageSkipped} зураг татаж чадсангүй, зураггүй үлдлээ.</p>`;
  } else if (!errors) {
    summary = `<p class="import-report__ok">Бүх мөр амжилттай импортлогдлоо.</p>`;
  }
  const imageStat =
    kind === "products" && (imageSuccess || imageSkipped)
      ? `<p><span>Зураг хадгалсан</span><b class="text-tone-success">${imageSuccess}</b></p><p><span>Зураг алгассан</span><b class="${imageSkipped ? "text-tone-danger" : ""}">${imageSkipped}</b></p>`
      : "";
  const body = `<div class="import-report"><div class="import-report__stats"><p><span>Нийт мөр</span><b>${report.total || 0}</b></p><p><span>Амжилттай</span><b class="text-tone-success">${report.success || 0}</b></p><p><span>Шинэ</span><b>${created}</b></p><p><span>Шинэчлэгдсэн</span><b>${updated}</b></p><p><span>Алдаатай</span><b class="${report.failed ? "text-tone-danger" : ""}">${report.failed || 0}</b></p>${imageStat}</div>${summary}${errors ? `<div class="import-report__errors"><p class="import-report__errors-title">Боловсруулж чадсангүй</p><ul>${errors}</ul></div>` : ""}</div>`;
  confirmModal(`${label} импортын тайлан`, body, {
    confirmLabel: "Хаах",
    cancelLabel: "Нэмэх",
    closable: true,
    onConfirm: () => closeConfirmCard(),
    onCancel: () => closeConfirmCard(),
  });
}
function applyImportPayload(kind, payload) {
  if (!payload) return false;
  const report = payload.report || {};
  if (kind === "customers" && Array.isArray(payload.customers)) {
    state.customers = payload.customers;
    if ((report.success || 0) > 0) {
      state.searches.customers = "";
      state.currentView = "customers";
    }
    return true;
  }
  if (kind === "products" && Array.isArray(payload.products)) {
    state.products = payload.products;
    if ((report.success || 0) > 0) {
      state.searches.products = "";
      state.filters.category = "all";
      state.currentView = "products";
    }
    return true;
  }
  return false;
}
function finishImportSuccess(kind, payload, report) {
  applyImportPayload(kind, payload);
  syncBackendSaveMarker();
  if (payload?.updatedAt) serverUpdatedAt = payload.updatedAt;
  clearOrderPersistenceCache();
  clearBackendSaveFailed();
  saveLocalBackendCache({
    state: persistentState(),
    updatedAt: payload.updatedAt || serverUpdatedAt || "",
  });
  render();
  const label = importKindLabel(kind);
  const created = Number(report.created || 0);
  const updated = Number(report.updated || 0);
  if ((report.success || 0) > 0 && !(report.failed || 0)) {
    const detail =
      created && updated
        ? `${created} шинэ, ${updated} шинэчлэгдсэн`
        : created
          ? `${created} шинэ`
          : updated
            ? `${updated} шинэчлэгдсэн`
            : `${report.success} мөр`;
    showAppToast(`${label}: ${detail} нэмэгдлээ`, "success");
  } else if ((report.success || 0) > 0) {
    showAppToast(
      `${label}: ${report.success} амжилттай, ${report.failed || 0} алдаатай`,
      "error",
    );
  } else {
    showAppToast(
      `${label} импорт амжилтгүй${importReportHint(report)}`,
      "error",
    );
  }
  showImportReportModal(report, kind);
}
async function handleImportFile(kind, file) {
  if (!canImportExcel()) return alertModal("Эрхгүй", "Excel оруулах эрхгүй.");
  if (!file) return;
  if (!(await importFileLooksLikeExcel(file))) {
    return alertModal("Алдаа", IMPORT_FILE_FORMAT_HINT);
  }
  if (importLoading) return;
  syncCurrentEmployeeFromState();
  if (!state.currentEmployee?.id) {
    return alertModal(
      "Нэвтрээгүй",
      "Excel импорт хийхийн тулд дахин нэвтэрнэ үү.",
    );
  }
  const path = importApiPath(kind);
  const uploadName = importUploadFilename(file, kind);
  const fd = new FormData();
  fd.append("file", file, uploadName);
  fd.append("actor", importActorPayload());
  const csrf = csrfTokenFromCookie();
  const headers = csrf ? { "X-CSRFToken": csrf } : {};
  clearTimeout(backendSaveTimer);
  backendSaveTimer = null;
  setImportLoading(true, `${importKindLabel(kind)} Excel импорт хийж байна...`);
  try {
    await waitForBackendSaveIdle();
    backendSaving = true;
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: fd,
      headers,
      cache: "no-store",
      credentials: "same-origin",
    });
    let payload = null;
    let responseText = "";
    try {
      responseText = await res.text();
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const fallback =
        responseText && !responseText.trim().startsWith("<")
          ? responseText
          : "Импорт амжилтгүй";
      const msg = importApiDetail(payload, fallback);
      showAppToast(String(msg), "error");
      alertModal("Импорт амжилтгүй", esc(String(msg)));
      return;
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("Импортын хариу буруу байна");
    }
    const report = payload.report || {};
    finishImportSuccess(kind, payload, report);
  } catch (error) {
    console.warn("Import failed", error);
    const msg = error?.message || "Импорт хийхэд алдаа гарлаа";
    showAppToast(msg, "error");
    alertModal("Алдаа", `${esc(msg)}. ${IMPORT_FILE_FORMAT_HINT}`);
  } finally {
    backendSaving = false;
    setImportLoading(false);
  }
}
function onImportFileSelected(input) {
  if (!input?.files?.[0]) return;
  const kind = input.getAttribute("data-import-file") || "";
  if (!kind) return;
  const file = input.files[0];
  input.value = "";
  void handleImportFile(kind, file);
}
function initExcelImportHandlers() {
  if (initExcelImportHandlers._bound) return;
  initExcelImportHandlers._bound = true;
  ensureGlobalImportFileInputs();
  document.addEventListener(
    "click",
    (e) => {
      const downloadBtn = e.target.closest?.("[data-import-download]");
      if (downloadBtn) {
        e.preventDefault();
        e.stopPropagation();
        downloadImportTemplate(
          downloadBtn.getAttribute("data-import-download") || "",
        );
        return;
      }
      const uploadBtn = e.target.closest?.("[data-import-upload]");
      if (uploadBtn) {
        e.preventDefault();
        e.stopPropagation();
        const kind = uploadBtn.getAttribute("data-import-upload") || "";
        const input = importFileInput(kind);
        if (input) input.click();
        return;
      }
    },
    true,
  );
  document.addEventListener(
    "change",
    (e) => {
      const input = e.target;
      if (!input?.matches?.("input[data-import-file]")) return;
      onImportFileSelected(input);
    },
    true,
  );
  document.addEventListener("dragover", (e) => {
    const zone = e.target.closest?.("[data-import-dropzone]");
    if (!zone) return;
    e.preventDefault();
    zone.classList.add("is-dragover");
  });
  document.addEventListener("dragleave", (e) => {
    const zone = e.target.closest?.("[data-import-dropzone]");
    if (!zone) return;
    zone.classList.remove("is-dragover");
  });
  document.addEventListener("drop", (e) => {
    const zone = e.target.closest?.("[data-import-dropzone]");
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove("is-dragover");
    const kind = zone.getAttribute("data-import-dropzone") || "";
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImportFile(kind, file);
  });
}
function pageToolbarSearch({
  focusKey,
  value = "",
  placeholder = "Хайх...",
  oninput = "",
} = {}) {
  const handler =
    oninput || (focusKey ? `search('${focusKey}',this.value)` : "");
  return `<input data-focus="${esc(focusKey || "")}" value="${esc(value)}" oninput="${handler}" placeholder="${esc(placeholder)}" class="page-toolbar__search app-input" autocomplete="off">`;
}
function pageToolbarPrimaryBtn(label, onclick, extraClass = "") {
  return `<button type="button" onclick="${onclick}" class="btn btn--toolbar btn--toolbar-primary ${extraClass}">${esc(label)}</button>`;
}
function pageActionAddBtn(label, onclick, variant = "") {
  const variantClass = variant ? ` page-action-add--${variant}` : "";
  return `<button type="button" onclick="${onclick}" class="btn page-action-add${variantClass}">+ ${esc(label)}</button>`;
}
function listActionToolbarHtml({
  search = "",
  excelBtn = "",
  addBtn = "",
  importKind = "",
} = {}) {
  const importHtml = importKind ? excelImportToolbar(importKind) : "";
  return `<div class="list-action-toolbar">${search}${excelBtn ? `<div class="list-action-toolbar__tools">${excelBtn}</div>` : ""}${addBtn}${importHtml}</div>`;
}
function pageToolbarSecondaryBtn(label, onclick, extraClass = "") {
  return `<button type="button" onclick="${onclick}" class="btn btn--toolbar btn--toolbar-secondary ${extraClass}">${esc(label)}</button>`;
}
function pageToolbarHtml({ filters = "", actions = "", extraClass = "" } = {}) {
  if (!filters && !actions) return "";
  const filtersHtml = filters
    ? `<div class="page-toolbar__filters">${filters}</div>`
    : "";
  const actionsHtml = actions
    ? `<div class="page-toolbar__actions">${actions}</div>`
    : "";
  return `<div class="page-toolbar ${extraClass}">${filtersHtml}${actionsHtml}</div>`;
}
function updateModalTitle(title) {
  const el = document.getElementById("modal-title");
  if (el) el.textContent = title;
}
function pickerModalCustomer() {
  return state.customers.find((c) => c.id === state.workerCustomer) || null;
}
function pickerModalTitleHtml() {
  const c = pickerModalCustomer();
  return c ? workerStoreSummary(c, true) : esc(ORDER_PICKER_TITLE);
}
function updatePickerModalTitle() {
  const el = document.getElementById("picker-order-title");
  if (!el) return;
  const c = pickerModalCustomer();
  if (c) el.innerHTML = workerStoreSummary(c, true);
  else el.textContent = ORDER_PICKER_TITLE;
}
const cats = () => [
  ...new Set([
    ...state.products.map((p) => p.category),
    ...state.extraCategories,
  ]),
];
const role = (r) =>
  ({
    admin: "Админ",
    sales: "Худалдааны төлөөлөгч",
    warehouse: "Нярав",
    delivery: "Түгээгч",
  })[r] || "Ажилчин";
function deliveryEmployees() {
  return state.employees.filter((e) => e.role === "delivery");
}
function ensureDeliverySelection() {
  if (!state.selectedDeliveryId) {
    state.deliveryName = "";
    state.deliveryPhone = "";
    return;
  }
  const emp = state.employees.find((e) => e.id === state.selectedDeliveryId);
  if (emp?.role === "delivery") {
    state.deliveryName = emp.name;
    state.deliveryPhone = emp.phone || "";
    return;
  }
  state.selectedDeliveryId = "";
  state.deliveryName = "";
  state.deliveryPhone = "";
}
function receiptPrintDeliveryOpts() {
  const id = state.receiptPrintDeliveryId || "";
  if (!id || state.currentView !== "warehouseReceipts") return {};
  return { printDeliveryId: id };
}
function resolveOrderDelivery(o = {}, opts = {}) {
  const printId = opts.printDeliveryId || "";
  const sessionId =
    opts.useSessionFallback === false ? "" : state.selectedDeliveryId || "";
  const id = printId || o.deliveryEmployeeId || sessionId || "";
  const emp = id ? state.employees.find((e) => e.id === id) : null;
  if (emp) {
    return {
      deliveryEmployeeId: emp.id,
      deliveryName: emp.name || "-",
      deliveryPhone: emp.phone || "-",
    };
  }
  const storedName = String(o.deliveryName || "").trim();
  if (storedName) {
    return {
      deliveryEmployeeId: o.deliveryEmployeeId || "",
      deliveryName: storedName,
      deliveryPhone: o.deliveryPhone || "-",
    };
  }
  if (opts.useSessionFallback !== false && state.deliveryName) {
    return {
      deliveryEmployeeId: sessionId,
      deliveryName: state.deliveryName,
      deliveryPhone: state.deliveryPhone || "-",
    };
  }
  return { deliveryEmployeeId: "", deliveryName: "-", deliveryPhone: "-" };
}
function deliveryFieldsForNewOrder() {
  ensureDeliverySelection();
  const id = state.selectedDeliveryId || "";
  const emp = id
    ? state.employees.find((e) => e.id === id && e.role === "delivery")
    : null;
  if (!emp) {
    return { deliveryEmployeeId: "", deliveryName: "", deliveryPhone: "" };
  }
  return {
    deliveryEmployeeId: emp.id,
    deliveryName: emp.name || "",
    deliveryPhone: emp.phone || "",
  };
}
function currentRole() {
  return state.currentEmployee?.role || "";
}
function permApi() {
  return window.TOMUDA_PERMISSIONS || null;
}
function syncCurrentEmployeeFromState() {
  const id = state.currentEmployee?.id;
  if (!id) return;
  const fresh = state.employees.find((e) => e.id === id);
  if (fresh) state.currentEmployee = fresh;
}
function resolveEmployeePermissions(emp = state.currentEmployee) {
  return permApi()?.resolveEmployeePermissions(emp) || new Set();
}
function hasPermission(key, emp = state.currentEmployee) {
  if (permApi()) return permApi().hasPermission(key, emp);
  const r = emp?.role || currentRole();
  if (r === "admin") return true;
  if (r === "warehouse")
    return (
      key.startsWith("warehouse.") ||
      key === "products.view" ||
      key === "dashboard.view"
    );
  if (r === "delivery") return key === "orders.view";
  if (r === "sales")
    return [
      "dashboard.view",
      "orders.view",
      "orders.create",
      "orders.edit",
      "customers.view",
      "customers.create",
      "products.view",
      "warehouse.view",
    ].includes(key);
  return false;
}
function employeePermissionSummary(emp) {
  const count = resolveEmployeePermissions(emp).size;
  return count ? `${count} эрх` : "Эрхгүй";
}
function isAdmin() {
  return (
    hasPermission("dashboard.view") ||
    hasPermission("settings.view") ||
    hasPermission("permissions.view")
  );
}
function canViewProductCost(emp = state.currentEmployee) {
  const r = emp?.role || currentRole();
  return r === "admin" || r === "warehouse";
}
function productCostMetaHtml(p) {
  if (!canViewProductCost()) return "";
  const cost = productCostPrice(p);
  return cost ? `<span>Өртөг: <b>${fmt(cost)}</b></span>` : "";
}
function canManageProducts() {
  return (
    hasPermission("products.create") ||
    hasPermission("products.edit") ||
    hasPermission("productAdd.create") ||
    hasPermission("productAdd.view")
  );
}
function canManageProductCategories() {
  return (
    hasPermission("categoryAdd.view") ||
    hasPermission("categoryAdd.create") ||
    hasPermission("categoryAdd.edit") ||
    canManageProducts()
  );
}
function canManageEmployees() {
  return (
    hasPermission("employees.create") ||
    hasPermission("employees.edit") ||
    hasPermission("employeeAdd.create") ||
    hasPermission("employeeAdd.view")
  );
}
function canManageEmployeePermissions(emp = state.currentEmployee) {
  return (
    hasPermission("permissions.view", emp) ||
    hasPermission("permissions.edit", emp) ||
    hasPermission("permissions.create", emp) ||
    hasPermission("employees.edit", emp)
  );
}
function canExportExcel() {
  return (
    hasPermission("excelExport.view") ||
    hasPermission("excelExport.create") ||
    hasPermission("reports.view")
  );
}
function canImportExcel() {
  return (
    hasPermission("excelImport.view") ||
    hasPermission("excelImport.create") ||
    hasPermission("products.create") ||
    hasPermission("customers.create")
  );
}
function canDownloadExcelTemplate() {
  return (
    hasPermission("excelTemplate.view") ||
    hasPermission("excelTemplate.create") ||
    canImportExcel()
  );
}
function canManageStockIn() {
  return (
    hasPermission("stockIn.view") ||
    hasPermission("stockIn.create") ||
    hasPermission("stockIn.edit") ||
    hasPermission("warehouse.edit")
  );
}
function canManageStockOut() {
  return (
    hasPermission("stockOut.view") ||
    hasPermission("stockOut.create") ||
    hasPermission("stockOut.edit") ||
    hasPermission("warehouse.edit")
  );
}
function canManageCount() {
  return (
    hasPermission("count.view") ||
    hasPermission("count.create") ||
    hasPermission("count.edit") ||
    hasPermission("warehouse.edit")
  );
}
function canManageReceipts() {
  return hasPermission("receipts.view") || hasPermission("warehouse.view");
}
function canManagePromotions() {
  return (
    hasPermission("promotions.view") ||
    hasPermission("promotions.edit") ||
    hasPermission("settings.view")
  );
}
function canManageStockAlert() {
  return (
    hasPermission("stockAlert.view") ||
    hasPermission("stockAlert.edit") ||
    hasPermission("settings.view")
  );
}
function canManagePercentDiscountSettings() {
  return (
    hasPermission("percentDiscount.view") ||
    hasPermission("percentDiscount.edit") ||
    hasPermission("settings.view")
  );
}
function canManageOrderHistorySettings() {
  return (
    hasPermission("orderHistory.view") ||
    hasPermission("orderHistory.edit") ||
    hasPermission("settings.view")
  );
}
function canDelete() {
  if (!state.isLoggedIn) return false;
  return (
    hasPermission("products.delete") ||
    hasPermission("products.edit") ||
    hasPermission("employees.delete") ||
    hasPermission("employees.edit") ||
    hasPermission("customers.delete") ||
    hasPermission("customers.edit") ||
    hasPermission("customers.create") ||
    hasPermission("orders.delete") ||
    hasPermission("orders.edit") ||
    hasPermission("receipts.delete")
  );
}
function canDeleteReceipt() {
  if (!state.isLoggedIn) return false;
  return (
    hasPermission("receipts.delete") ||
    hasPermission("orders.delete") ||
    canDelete()
  );
}
function requireAdminDelete() {
  if (canDelete()) return true;
  alertModal("Эрхгүй", "Устгах эрхгүй.");
  return false;
}
function defaultViewForRole(r) {
  const emp = state.employees.find((e) => e.role === r);
  if (emp && permApi()) {
    const nav = permApi().allowedNavForEmployee(emp);
    if (nav.length) return nav[0][0];
  }
  if (r === "admin") return "admin";
  if (r === "delivery") return "delivery";
  if (r === "warehouse") return "warehouse";
  return "worker";
}
function canAccessView(viewId) {
  if (viewId === "employeePermissions" && canManageEmployeePermissions()) {
    return true;
  }
  if (permApi()) return permApi().canAccessView(viewId, state.currentEmployee);
  const r = currentRole();
  if (r === "admin") return true;
  if (r === "delivery") return viewId === "delivery";
  if (r === "warehouse") return viewId === "warehouse";
  if (r === "sales")
    return ["worker", "customers", "products", "warehouse"].includes(viewId);
  return false;
}
function allowedNavIds() {
  if (permApi()) {
    return permApi()
      .allowedNavForEmployee(state.currentEmployee)
      .map(([id]) => id);
  }
  const r = currentRole();
  if (r === "admin")
    return ["worker", "customers", "products", "warehouse", "admin"];
  if (r === "warehouse") return ["warehouse"];
  if (r === "delivery") return ["delivery"];
  if (r === "sales") return ["worker", "customers", "products", "warehouse"];
  return ["worker", "customers", "products"];
}
function ensureEmployeePermissions() {
  if (!permApi()) return;
  state.employees.forEach((e) => {
    if (!Array.isArray(e.permissions)) return;
    e.permissions = permApi().normalizeKeys(e.permissions);
  });
}
function employeePermissionsSelected(e, role = "sales") {
  if (e?.permissions?.length) return permApi().normalizeKeys(e.permissions);
  return permApi().templateForRole(role || e?.role || "sales");
}
function syncEmployeePermissionsFromRole() {
  const form = document.querySelector("[data-employee-form]");
  const root = form || document.querySelector("[data-permissions-form]");
  if (!root || !permApi()) return;
  const role =
    form?.querySelector("#employeeRoleSelect")?.value ||
    state.employees.find((e) =>
      (state.permissionEmployeeIds || []).includes(e.id),
    )?.role ||
    "sales";
  const keys = new Set(permApi().templateForRole(role));
  root.querySelectorAll('input[name="permissions"]').forEach((el) => {
    el.checked = keys.has(el.value);
  });
  permApi()?.syncAllPermissionRowDeps?.(root);
}
function togglePermissionEmployee(id, ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.permissionEmployeeIds = state.permissionEmployeeIds || [];
  const idx = state.permissionEmployeeIds.indexOf(id);
  if (idx >= 0) state.permissionEmployeeIds.splice(idx, 1);
  else state.permissionEmployeeIds.push(id);
  state.permissionEmployeePickerOpen = true;
  render();
}
function permissionEmployeeSummary(
  selected = idList(state.permissionEmployeeIds),
) {
  if (!selected.length) return "Сонгох";
  if (selected.length === 1) {
    const emp = state.employees.find((e) => e.id === selected[0]);
    return emp?.name || "1 сонгосон";
  }
  return `${selected.length} ажилтан сонгосон`;
}
function permissionEmployeePickerHtml() {
  const people = [...state.employees].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "mn"),
  );
  const selected = idList(state.permissionEmployeeIds);
  const open = !!state.permissionEmployeePickerOpen;
  const summary = permissionEmployeeSummary(selected);
  const triggerAttrs = whReceiptPickerTriggerAttrs();
  return `<div class="wh-receipt-picker${open ? " is-open" : ""}" data-permission-employee-picker><button type="button" class="wh-receipt-picker__trigger"${triggerAttrs} onclick="togglePermissionEmployeePicker(event)" aria-expanded="${open ? "true" : "false"}" aria-haspopup="listbox"><span class="wh-receipt-picker__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></span><span class="wh-receipt-picker__value${selected.length ? "" : " is-placeholder"}">${esc(summary)}</span><svg class="wh-receipt-picker__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>${open ? `<div class="wh-receipt-picker__panel" role="listbox" aria-label="Ажилтан" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onpointerdown="armWhReceiptPickerDismissGuard()"><div class="wh-receipt-picker__head"><span class="wh-receipt-picker__head-title">Сонгох</span>${selected.length ? `<button type="button" class="wh-receipt-picker__clear" onclick="clearPermissionEmployees(event)">Цэвэрлэх</button>` : ""}</div><div class="wh-receipt-picker__list">${people.length ? people.map((e) => `<label class="wh-receipt-picker__item${selected.includes(e.id) ? " is-active" : ""}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox"${selected.includes(e.id) ? " checked" : ""} onmousedown="event.preventDefault()" onchange="togglePermissionEmployee('${esc(e.id)}', event)"><span class="wh-receipt-picker__avatar-wrap">${employeeAvatarHtml(e, "wh-receipt-picker__avatar")}</span><span class="wh-receipt-picker__meta"><span class="wh-receipt-picker__name">${esc(e.name)}</span><span class="wh-receipt-picker__role">${esc(role(e.role))}</span></span></label>`).join("") : `<p class="wh-receipt-picker__empty">Ажилтан олдсонгүй</p>`}</div><div class="wh-receipt-picker__foot"><button type="button" class="btn btn--primary btn--sm btn--block" onclick="closePermissionEmployeePicker(event)">Болсон</button></div></div>` : ""}</div>`;
}
function togglePermissionEmployeePicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.permissionEmployeePickerOpen = !state.permissionEmployeePickerOpen;
  render();
}
function closePermissionEmployeePicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.permissionEmployeePickerOpen = false;
  render();
}
function clearPermissionEmployees(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.permissionEmployeeIds = [];
  state.permissionEmployeePickerOpen = true;
  render();
}
function selectedPermissionEmployees() {
  const ids = new Set(state.permissionEmployeeIds || []);
  return state.employees.filter((e) => ids.has(e.id));
}
function mergedPermissionSelection() {
  const api = permApi();
  if (!api?.mergePermissionsForEmployees) {
    const emps = selectedPermissionEmployees();
    const union = new Set();
    emps.forEach((e) =>
      resolveEmployeePermissions(e).forEach((k) => union.add(k)),
    );
    return [...union];
  }
  return api.mergePermissionsForEmployees(selectedPermissionEmployees());
}
function mergedPermissionPercentDiscount(
  selected = selectedPermissionEmployees(),
) {
  const sales = selected.filter((e) => e.role === "sales");
  if (!sales.length) return null;
  if (sales.every((e) => e.allowPercentDiscount !== false)) return true;
  if (sales.every((e) => e.allowPercentDiscount === false)) return false;
  return null;
}
function permissionPercentDiscountFieldHtml(selectedEmployees = []) {
  const sales = selectedEmployees.filter((e) => e.role === "sales");
  if (!sales.length) return "";
  const merged = mergedPermissionPercentDiscount(sales);
  const checked = merged === true;
  const mixed = merged === null;
  return `<section class="perm-grant-pct"><p class="perm-grant-pct__label">Хувь тооцох</p><label class="perm-grant-pct__row"><span class="perm-grant-pct__text">Захиалга дээр ${percentDiscountRate()}% хөнгөлөлт тооцох зөвшөөрөл${mixed ? " (сонгогдсон ажилтнууд өөр өөр)" : ""}</span><span class="perm-toggle perm-toggle--sm"><input type="checkbox" name="allowPercentDiscount"${checked ? " checked" : ""}${mixed ? ' data-pct-mixed="1"' : ""} aria-label="Хувь тооцох зөвшөөрөл"><span class="perm-toggle__track" aria-hidden="true"><span class="perm-toggle__thumb"></span></span></span></label></section>`;
}
function saveGrantedPermissions() {
  if (!canManageEmployeePermissions()) {
    return alertModal("Эрхгүй", "Эрх олгох эрхгүй.");
  }
  const ids = state.permissionEmployeeIds || [];
  if (!ids.length) return alert("Дор хаяж нэг ажилтан сонгоно уу");
  const root = document.querySelector("[data-permissions-form]");
  const permissions = permApi()?.permissionsFromForm(root || document) || [];
  if (!permissions.length) return alert("Дор хаяж нэг эрх сонгоно уу");
  const pctInput = document.querySelector('input[name="allowPercentDiscount"]');
  const allowPct = !!pctInput?.checked;
  ids.forEach((id) => {
    const emp = state.employees.find((e) => e.id === id);
    if (!emp) return;
    emp.permissions = [...permissions];
    if (emp.role === "sales" && pctInput) emp.allowPercentDiscount = allowPct;
    if (state.currentEmployee?.id === id) {
      state.currentEmployee = emp;
      if (!allowPct) state.applyPercentDiscount = false;
    }
  });
  scheduleBackendSave();
  showInstallToast("Эрх хадгалагдлаа");
  render();
}
function openEmployeePermissionsPage() {
  if (!canManageEmployeePermissions()) {
    return alertModal("Эрхгүй", "Эрх олгох эрхгүй.");
  }
  go("employeePermissions");
}
function employeePermissionsView() {
  if (!canManageEmployeePermissions()) {
    return `<div class="space-y-4">${pageHead("Эрхийн тохиргоо")}<p class="text-sm text-muted-foreground">Эрх хүрэлцэхгүй.</p></div>`;
  }
  const selectedEmployees = selectedPermissionEmployees();
  const permHtml = permApi().permissionsFieldHtml(
    mergedPermissionSelection(),
    selectedEmployees[0]?.role || "sales",
    { hideRoleReset: !selectedEmployees.length },
  );
  const saveBtn = `<button type="button" onclick="saveGrantedPermissions()" class="btn btn--primary btn--sm shrink-0">Хадгалах</button>`;
  const pctHtml = permissionPercentDiscountFieldHtml(selectedEmployees);
  return `<div class="space-y-4 perm-grant-page">${pageHead("Эрхийн тохиргоо", saveBtn)}<section class="perm-grant-employees"><p class="perm-grant-employees__label">Ажилтан сонгох</p>${permissionEmployeePickerHtml()}${selectedEmployees.length ? `<p class="perm-grant-employees__meta text-xs text-muted-foreground mt-2">${selectedEmployees.length} ажилтан сонгогдсон</p>` : `<p class="perm-grant-employees__meta text-xs text-muted-foreground mt-2">Нэг эсвэл олон ажилтан сонгоно уу</p>`}</section>${pctHtml}${permHtml}</div>`;
}
const EMPLOYEE_EMAIL_DEFAULTS = {
  admin: "admin@tomuda.mn",
  "emp-dulam": "aguulah@tomuda.mn",
  "emp-hasan": "ht@tomuda.mn",
  "emp-galsan": "ht.galsan@tomuda.mn",
  "emp-munkh": "ht.munkh@tomuda.mn",
  "emp-tugeegch": "tugeegch@tomuda.mn",
};
function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function ensureEmployeeEmails() {
  state.employees.forEach((e) => {
    if (!e.email && EMPLOYEE_EMAIL_DEFAULTS[e.id]) {
      e.email = EMPLOYEE_EMAIL_DEFAULTS[e.id];
    }
  });
}
function canTakeOrdersRole(r) {
  if (permApi()) return hasPermission("orders.create");
  return r === "sales" || r === "admin";
}
function salesOrderAgents() {
  return state.employees
    .filter((e) => e.role === "sales" || e.role === "admin")
    .sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "mn"),
    );
}
function ensureOrderEmployeeSelection() {
  const cur = state.currentEmployee;
  if (!cur) return;
  const agents = salesOrderAgents();
  if (!agents.length) return;
  const valid = new Set(agents.map((e) => e.id));
  if (state.orderEmployee && valid.has(state.orderEmployee)) return;
  if (valid.has(cur.id)) state.orderEmployee = cur.id;
  else state.orderEmployee = agents[0].id;
}
function shouldShowOrderAgentPicker(emp = state.currentEmployee) {
  if (!emp) return true;
  if (emp.role === "admin" && canTakeOrdersRole(emp.role)) return true;
  if (emp.role === "sales" && canTakeOrdersRole(emp.role)) return false;
  return true;
}
function orderActor() {
  const cur = state.currentEmployee;
  if (!cur) return {};
  const picked = state.orderEmployee
    ? state.employees.find((x) => x.id === state.orderEmployee)
    : null;
  if (picked) return picked;
  if (cur.role === "sales" || cur.role === "admin") return cur;
  return cur;
}
function orderEmployeeChoices() {
  return salesOrderAgents();
}
function orderEmailFields(emp) {
  const actor = emp || state.currentEmployee || {};
  return {
    employeeEmail: actor.email || "",
    createdByEmail: state.currentEmployee?.email || actor.email || "",
  };
}
const status = (s) =>
  ({
    pending: "Хүлээгдэж буй",
    confirmed: "Баталсан",
    delivered: "Хүргэсэн",
    cancelled: "Цуцалсан",
  })[s];
const badge = (s) =>
  ({
    confirmed: "tone tone--success",
    pending: "tone tone--warning",
    delivered: "tone tone--info",
    cancelled: "tone tone--danger",
  })[s] || "tone tone--danger";
const metricsNotifyIcon = (active = false) =>
  `<span class="metrics-bar__notify${active ? " metrics-bar__notify--active" : ""}" aria-hidden="true"><svg class="ui-icon metrics-bar__notify-icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>`;
const ADMIN_METRIC_ICONS = {
  stock:
    '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  customers:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  employees:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  count: '<path d="M4 7h16M4 12h10M4 17h16"/><path d="M18 10v6M15 13h6"/>',
};
function adminMetricCard(
  label,
  value,
  tone = "",
  { active = false, action = "", icon = "stock" } = {},
) {
  const svg = ADMIN_METRIC_ICONS[icon] || ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="${action}" class="admin-metric-card${active ? " admin-metric-card--active" : ""}" aria-label="${esc(label)}: ${value}"><span class="admin-metric-card__icon-wrap${active ? " is-active" : ""}"><svg class="ui-icon admin-metric-card__icon" viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${active ? `<span class="admin-metric-card__dot" aria-hidden="true"></span>` : ""}</span><span class="admin-metric-card__label">${label}</span><b class="admin-metric-card__value ${tone}">${value}</b></button>`;
}
function adminMetricsBar(items) {
  return `<div class="admin-metrics">${items}</div>`;
}
const card = (l, v, t = "", opts = null) => {
  const notify = opts && opts.notify,
    notifyActive = notify && !!opts.active;
  return `<div class="metrics-bar__item${notify ? " metrics-bar__item--notify" : ""}">${notify ? metricsNotifyIcon(notifyActive) : ""}<span class="metrics-bar__label">${l}</span><b class="metrics-bar__value ${t}">${v}</b></div>`;
};
const metricsBar = (items, cols = "", modifier = "") =>
  `<div class="metrics-bar${cols ? ` metrics-bar--${cols}` : ""}${modifier ? ` metrics-bar--${modifier}` : ""}">${items}</div>`;
const pageBackBtnHtml = () =>
  `<button type="button" class="page-head__back" onclick="appBack()" aria-label="Буцах"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>`;
function canPageBack() {
  if (!state.isLoggedIn) return false;
  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    return true;
  }
  return [
    "employees",
    "employeePermissions",
    "inventory",
    "reports",
    "promotions",
    "warehouseReceipts",
    "count",
  ].includes(state.currentView);
}
const pageHead = (title, action = "", opts = {}) => {
  const showBack = opts.back !== false && (opts.back === true || canPageBack());
  const back = showBack ? pageBackBtnHtml() : "";
  if (action || showBack) {
    return `<div class="page-head page-head--row${showBack ? " page-head--with-back" : ""}">${back}<h2 class="page-head__title">${title}</h2>${action ? `<div class="page-head__actions">${action}</div>` : ""}</div>`;
  }
  return `<h2 class="page-head__title">${title}</h2>`;
};
const MOBILE_NAV_SHORT = {
  worker: "Захиалга",
  customers: "Харилцагч",
  products: "Бараа",
  warehouse: "Агуулах",
  delivery: "Хүргэлт",
  count: "Тооллого",
  employees: "Ажилтан",
  inventory: "Бүртгэл",
  reports: "Борлуулалтын тайлан",
  promotions: "Урамшуулал",
  admin: "Админ",
};
const MOBILE_NAV_SVG = {
  worker:
    '<path d="M6 6h15l-1.5 9h-12L6 6z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  customers: '<path d="M3 9h18v12H3z"/><path d="M7 9V6a5 5 0 0 1 10 0v3"/>',
  products:
    '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  warehouse:
    '<path d="M9 5H5a2 2 0 0 0-2 2v12h16V7a2 2 0 0 0-2-2h-4"/><path d="M9 5a2 2 0 0 1 4 0v2H9V5z"/>',
  delivery:
    '<path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  count: '<path d="M4 7h16M4 12h10M4 17h16"/><path d="M18 10v6M15 13h6"/>',
  employees:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  inventory:
    '<path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><path d="M12 12v6"/>',
  reports:
    '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 17V9"/><path d="M12 17V7"/><path d="M16 17v-4"/>',
  promotions:
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  admin:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
function sidebarNavForRole(role) {
  if (permApi() && state.currentEmployee) {
    return permApi()
      .allowedNavForEmployee(state.currentEmployee)
      .map(([id, label]) => [id, label]);
  }
  if (role === "delivery") return [["delivery", "Хүргэлт"]];
  if (role === "admin")
    return [
      ["worker", "Шинэ захиалга"],
      ["customers", "Харилцагч"],
      ["products", "Бараа"],
      ["warehouse", "Нярав"],
      ["employees", "Ажилтан"],
      ["inventory", "Агуулахын бүртгэл"],
      ["reports", "Борлуулалтын тайлан"],
      ["promotions", "Урамшуулал"],
      ["admin", "Админ"],
    ];
  return [
    ["worker", "Шинэ захиалга"],
    ["customers", "Харилцагч"],
    ["products", "Бараа"],
    ["warehouse", "Нярав"],
    ["admin", "Админ"],
  ].filter(([id]) => allowedNavIds().includes(id));
}
function bottomNavForRole(role) {
  const allowed = new Set(allowedNavIds());
  const mobileIds = {
    admin: ["worker", "customers", "products", "warehouse", "admin"],
    sales: ["worker", "customers", "products", "warehouse"],
    warehouse: ["warehouse"],
    delivery: ["delivery"],
  };
  const ids = mobileIds[role] || mobileIds.sales;
  return sidebarNavForRole(role).filter(
    ([id]) => ids.includes(id) && allowed.has(id),
  );
}
function mobileNavIcon(id) {
  const paths = MOBILE_NAV_SVG[id];
  if (!paths)
    return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/></svg>';
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}
function mobileNavActive(viewId, navId) {
  if (viewId === navId) return true;
  if (
    navId === "admin" &&
    (viewId === "warehouseReceipts" ||
      viewId === "count" ||
      viewId === "delivery")
  )
    return true;
  return false;
}
function sidebarNavItems(nav) {
  return nav
    .map(([id, label]) => {
      const active = mobileNavActive(state.currentView, id);
      return `<button type="button" onclick="go('${id}');state.mobileOpen=false;render()" class="sidebar-nav-btn ${active ? "is-active" : ""}" aria-current="${active ? "page" : "false"}"><span class="sidebar-nav-btn__icon" aria-hidden="true">${mobileNavIcon(id)}</span><span class="sidebar-nav-btn__label">${esc(label)}</span></button>`;
    })
    .join("");
}
function mobileBottomNav(nav) {
  if (!nav.length) return "";
  return `<nav class="mobile-bottom-nav lg:hidden" aria-label="Үндсэн цэс">${nav
    .map(([id, label]) => {
      const active = mobileNavActive(state.currentView, id);
      return `<button type="button" onclick="go('${id}');state.mobileOpen=false;render()" class="mobile-bottom-nav__item ${active ? "is-active" : ""}" aria-current="${active ? "page" : "false"}"><span class="mobile-bottom-nav__icon" aria-hidden="true">${mobileNavIcon(id)}</span><span class="mobile-bottom-nav__label">${MOBILE_NAV_SHORT[id] || label}</span></button>`;
    })
    .join("")}</nav>`;
}
function currentPageTitle(nav) {
  if (state.currentView === "worker" && state.filters.worker === "orders") {
    return "Захиалгын жагсаалт";
  }
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer
  ) {
    const c = state.customers.find((x) => x.id === state.workerCustomer);
    if (c?.name) return c.name;
  }
  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    return promotionTypeLabel(state.filters.promotionDetail);
  }
  const extra = {
    employees: "Ажилтан",
    employeePermissions: "Эрхийн тохиргоо",
    inventory: "Нярав",
    reports: "Борлуулалтын тайлан",
    promotions: "Урамшуулал",
    warehouseReceipts: "Баримтууд",
    count: "Тооллого",
    delivery: "Хүргэлт",
  };
  if (extra[state.currentView]) return extra[state.currentView];
  const hit = nav.find(([id]) => mobileNavActive(state.currentView, id));
  if (hit) return hit[1];
  return "ТОМУДА";
}
const PRODUCT_IMAGE_FALLBACK =
  "/static/tomuda/icons/icon-192.png?v=20260630-logo";
const PRODUCT_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const brokenProductImageUrls = new Set();
function productImagePlaceholder(p = {}) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="${p.category === "Ундаа" ? "#dff5fb" : p.category === "Чихэр" ? "#fff0d8" : p.category === "Excel бүртгэл" ? "#eaf3e6" : "#eef2f5"}"/><circle cx="118" cy="34" r="24" fill="#16899a" opacity=".18"/><rect x="42" y="28" width="76" height="92" rx="14" fill="#fff" stroke="#16899a" stroke-width="4"/><rect x="55" y="45" width="50" height="28" rx="6" fill="#16899a" opacity=".85"/><text x="80" y="91" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#182032">${esc((p.name || "Бараа").slice(0, 12))}</text><text x="80" y="110" text-anchor="middle" font-family="Arial" font-size="11" fill="#687386">${esc(p.category || "")}</text></svg>`)}`;
}
function appBackendOrigin() {
  const base = String(API_BASE || "").trim();
  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      return new URL(base).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
}
function staticAssetUrl(path) {
  const raw = String(path || "").trim();
  if (!raw) return raw;
  if (/^(https?:|data:)/i.test(raw)) return raw;
  const origin = appBackendOrigin();
  return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}
function prefersMobileExcelShare() {
  return isSamsungDevice() || isAndroidDevice() || isIosDevice();
}
function zipFileOptions(extra = {}) {
  return { binary: true, createFolders: false, ...extra };
}
async function zipToExcelBlob(zip) {
  // Rebuild without directory stubs — Excel Mobile treats empty folder
  // entries as corrupt package content.
  const clean = new JSZip();
  const paths = Object.keys(zip.files || {}).filter(
    (path) => !zip.files[path]?.dir,
  );
  for (const path of paths) {
    const data = await zip.files[path].async("uint8array");
    clean.file(path, data, zipFileOptions());
  }
  const bytes = await clean.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return new Blob([bytes], { type: XLSX_MIME });
}
async function downloadBlobFile(blob, filename, opts = {}) {
  const { skipShare = false, savePicker = false } = opts;
  const name = safeDownloadFileName(filename, blob.type || XLSX_MIME);
  // Keep the original ArrayBuffer so Android share does not get a detached/streamed blob.
  const buffer = await blob.arrayBuffer();
  // Prefer octet-stream for <a download> so Safari/Chrome Save As a file
  // instead of opening HTML/text in a tab. Share still uses a proper type.
  const shareType =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : guessMimeFromFileName(name);
  const shareBlob = new Blob([buffer], { type: shareType });
  const downloadBlob = new Blob([buffer], {
    type: "application/octet-stream",
  });

  // Optional Save dialog (receipts) — keeps a clear file-download UX on desktop.
  if (savePicker && typeof window.showSaveFilePicker === "function") {
    try {
      const extMatch = name.match(/(\.[a-z0-9]+)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "";
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [
          {
            description: "Файл",
            accept: {
              [shareType || "application/octet-stream"]: ext ? [ext] : [".bin"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(downloadBlob);
      await writable.close();
      return true;
    } catch (err) {
      if (err?.name === "AbortError") return false;
      // Fall through to share / anchor download.
    }
  }

  if (typeof navigator.msSaveOrOpenBlob === "function") {
    navigator.msSaveOrOpenBlob(downloadBlob, name);
    return true;
  }

  // On Samsung/Android/iOS, share-to-Files/Excel opens reliably; forced
  // <a download> is often ignored (especially for blob: HTML).
  const useShare = !skipShare && prefersMobileExcelShare();
  if (
    useShare &&
    typeof navigator.share === "function" &&
    typeof File !== "undefined"
  ) {
    try {
      const file = new File([shareBlob], name, { type: shareType });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return true;
      }
    } catch (err) {
      if (err?.name === "AbortError") return false;
    }
  }

  const url = URL.createObjectURL(downloadBlob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.setAttribute("download", name);
    a.rel = "noopener";
    a.style.display = "none";
    // Do not set target=_blank — Android WebView often opens blob: as a blank
    // page and the saved file becomes unopenable.
    document.body.appendChild(a);
    a.click();
    // Keep the node briefly — some WebViews cancel download if removed instantly.
    setTimeout(() => {
      try {
        a.remove();
      } catch {
        /* ignore */
      }
    }, 2000);
  } finally {
    setTimeout(
      () => URL.revokeObjectURL(url),
      prefersMobileExcelShare() ? 60000 : 20000,
    );
  }
  return true;
}
function guessMimeFromFileName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".xlsx")) return XLSX_MIME;
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".html") || lower.endsWith(".htm"))
    return "text/html;charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv;charset=utf-8";
  return XLSX_MIME;
}
function safeDownloadFileName(name, mime = "") {
  let base = String(name || "download")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  if (!base) base = "download";
  const mimeStr = String(mime || "").toLowerCase();
  // Prefer the filename extension — octet-stream downloads must keep .html/.zip
  // so Excel/Numbers do not open a mangled spreadsheet.
  const wantsHtml =
    /\.html?$/i.test(base) ||
    mimeStr.includes("text/html") ||
    mimeStr === "text/html;charset=utf-8";
  const wantsZip =
    !wantsHtml &&
    (/\.zip$/i.test(base) ||
      mimeStr.includes("application/zip") ||
      mimeStr === "application/x-zip-compressed");
  const wantsCsv = /\.csv$/i.test(base) || mimeStr.includes("csv");
  const wantsXlsx =
    !wantsHtml &&
    !wantsZip &&
    (/\.xlsx$/i.test(base) ||
      mimeStr.includes("spreadsheetml") ||
      mimeStr.includes("openxmlformats"));
  // Do NOT treat text/html as .xls — Excel/Numbers strip logos and break layout.
  const wantsXls =
    !wantsHtml &&
    !wantsZip &&
    !wantsXlsx &&
    (mimeStr.includes("vnd.ms-excel") || /\.xls$/i.test(base));
  base = base.replace(/\.(xlsx|xls|csv|html|htm|zip)$/i, "");
  if (wantsHtml) return `${base || "download"}.html`;
  if (wantsZip) return `${base || "download"}.zip`;
  if (wantsCsv) return `${base || "download"}.csv`;
  if (wantsXls) return `${base || "download"}.xls`;
  return `${base || "download"}.xlsx`;
}
function productMediaPathFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/media/")) return raw;
  if (raw.startsWith("media/")) return `/${raw}`;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith("/media/")) {
        return `${parsed.pathname}${parsed.search || ""}`;
      }
    } catch {
      return "";
    }
  }
  return "";
}
function productImageUrlKey(url) {
  const media = productMediaPathFromUrl(url);
  const raw = media || String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw.slice(0, 96);
  const path = raw.split("?")[0];
  try {
    return new URL(path, appBackendOrigin()).pathname;
  } catch {
    return path;
  }
}
function resolveBackendAssetUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const mediaPath = productMediaPathFromUrl(raw);
  if (mediaPath) return new URL(mediaPath, appBackendOrigin()).href;
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }
  const origin = appBackendOrigin();
  if (raw.startsWith("//")) return `${window.location.protocol}${raw}`;
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) {
    return new URL(raw, origin).href;
  }
  if (raw.startsWith("media/") || raw.startsWith("static/")) {
    return new URL(`/${raw}`, origin).href;
  }
  return raw;
}
function pushUniqueProductImage(list, url) {
  const resolved = resolveBackendAssetUrl(url);
  if (!resolved) return;
  const key = productImageUrlKey(resolved);
  if (key && brokenProductImageUrls.has(key)) return;
  if (!list.some((item) => productImageUrlKey(item) === key))
    list.push(resolved);
}
function productImageMediaUrl(productId, ext = "jpg") {
  const id = String(productId || "").trim();
  if (!id) return "";
  return resolveBackendAssetUrl(
    `/media/products/${encodeURIComponent(id)}.${ext}`,
  );
}
function storedProductImage(p) {
  const raw = String(p?.image || "").trim();
  if (!raw || raw.startsWith("data:image/svg")) return "";
  return raw;
}
function isLocalProductImage(url) {
  const raw = String(url || "").trim();
  return !!productMediaPathFromUrl(raw) || raw.startsWith("data:image/");
}
function productImageFallbackList(p = {}) {
  const list = [];
  const id = String(p?.id || "").trim();
  const stored = storedProductImage(p);
  pushUniqueProductImage(list, stored);
  if (id) {
    PRODUCT_IMAGE_EXTENSIONS.forEach((ext) => {
      pushUniqueProductImage(list, productImageMediaUrl(id, ext));
    });
  }
  list.push(productImagePlaceholder(p));
  return list;
}
function productImgDataAttrs(p) {
  return `data-product-img data-product-id="${esc(p.id)}" alt="${esc(p.name)}"`;
}
function productImageSrc(p) {
  return productImageFallbackList(p)[0];
}
function findProductForImage(img) {
  const id = String(img?.dataset?.productId || "").trim();
  if (id) {
    const hit = state.products.find((x) => String(x.id) === id);
    if (hit) return hit;
  }
  const alt = String(img?.getAttribute("alt") || "").trim();
  if (alt) {
    const byName = state.products.find(
      (x) => String(x.name || "").trim() === alt,
    );
    if (byName) return byName;
  }
  const src = String(img?.getAttribute("src") || "");
  const match = src.match(/\/media\/products\/([^/?#.]+)/);
  if (match) {
    let mediaId = match[1];
    try {
      mediaId = decodeURIComponent(mediaId);
    } catch {
      /* keep raw id */
    }
    const fromMedia = state.products.find((x) => String(x.id) === mediaId);
    if (fromMedia) return fromMedia;
    return { id: mediaId, name: alt || "", category: "" };
  }
  return { name: alt || "", category: "" };
}
function applyProductImageFallback(img, product) {
  const candidates = productImageFallbackList(product);
  if (!candidates.length) return;
  let index = Number(img.dataset.imgFallbackIdx || "0");
  const current = String(img.getAttribute("src") || "");
  if (!img.dataset.imgFallbackIdx) {
    const found = candidates.findIndex((url) => url === current);
    index = found >= 0 ? found : 0;
  }
  img.onerror = () => {
    const failed = productImageUrlKey(img.currentSrc || img.src);
    if (failed) brokenProductImageUrls.add(failed);
    index += 1;
    if (index < candidates.length) {
      img.dataset.imgFallbackIdx = String(index);
      img.src = candidates[index];
    } else {
      img.onerror = null;
    }
  };
  img.dataset.imgFallbackReady = "1";
  if (
    !current ||
    current === PRODUCT_IMAGE_FALLBACK ||
    brokenProductImageUrls.has(productImageUrlKey(current)) ||
    current.startsWith("data:image/svg") ||
    (img.complete && img.naturalWidth === 0)
  ) {
    index = 0;
    img.dataset.imgFallbackIdx = "0";
    img.src = candidates[0];
  }
}
function bindProductImages(root = document) {
  root.querySelectorAll("img[data-product-img]").forEach((img) => {
    const product = findProductForImage(img);
    if (product?.id && !img.dataset.productId) {
      img.dataset.productId = String(product.id);
    }
    applyProductImageFallback(img, product);
  });
}
const productImage = (p) => productImageSrc(p);
function productImageSrcAttr(p) {
  return esc(productImageSrc(p));
}
function initProductImageField(p) {
  const value = document.getElementById("productImageValue");
  const preview = document.getElementById("productImagePreview");
  if (value) value.value = p?.image || "";
  if (preview) preview.src = productImage(p);
}
function mergeEntityRecords(remote = [], local = [], opts = {}) {
  const map = new Map();
  (remote || []).forEach((item) => {
    if (item?.id != null) map.set(String(item.id), { ...item });
  });
  (local || []).forEach((item) => {
    if (item?.id == null) return;
    const id = String(item.id);
    const prev = map.get(id);
    const merged = prev ? { ...prev, ...item } : { ...item };
    const image = preferredEntityImage(item.image, prev?.image);
    if (image) merged.image = image;
    else delete merged.image;
    if (opts.entityKind === "products" && prev && !localStateDirty()) {
      merged.stock = Number(prev.stock) || 0;
      if (prev.costPrice != null) merged.costPrice = prev.costPrice;
    }
    map.set(id, merged);
  });
  const tombstones = opts.deletionLog || [];
  if (opts.deletionType) {
    for (const id of [...map.keys()]) {
      if (deletionLogHas(tombstones, opts.deletionType, id)) map.delete(id);
    }
  }
  return Array.from(map.values());
}
function preferredEntityImage(localImage, remoteImage) {
  const local = String(localImage || "").trim();
  const remote = String(remoteImage || "").trim();
  if (local.startsWith("data:image/") && !local.startsWith("data:image/svg")) {
    return local;
  }
  if (
    remote.startsWith("data:image/") &&
    !remote.startsWith("data:image/svg")
  ) {
    return remote;
  }
  const localMedia = productMediaPathFromUrl(local);
  if (localMedia) return localMedia;
  const remoteMedia = productMediaPathFromUrl(remote);
  if (remoteMedia) return remoteMedia;
  return local || remote;
}

function persistentState() {
  return persistKeys.reduce((data, key) => {
    data[key] = state[key];
    return data;
  }, {});
}
function stripInlineEntityImages(items = []) {
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const img = String(item.image || "").trim();
    if (!img.startsWith("data:image/")) return item;
    const copy = { ...item };
    delete copy.image;
    return copy;
  });
}
function comparableBackendState(data = {}) {
  return {
    ...data,
    products: stripInlineEntityImages(data.products),
    customers: stripInlineEntityImages(data.customers),
    employees: stripInlineEntityImages(data.employees),
  };
}
function stateForBackendSave() {
  return comparableBackendState(persistentState());
}
function backendStateSnapshot(data = persistentState()) {
  return JSON.stringify({ state: comparableBackendState(data || {}) });
}
function readProductImageFromForm(form) {
  const hidden = form.querySelector("#productImageValue");
  let image = String(hidden?.value || "").trim();
  if (image.startsWith("data:image/svg")) image = "";
  if (!image) {
    const preview = form.querySelector("#productImagePreview");
    const src = String(preview?.currentSrc || preview?.src || "").trim();
    if (
      src.startsWith("data:image/") ||
      src.startsWith("/media/") ||
      src.startsWith("http")
    ) {
      image = src;
    }
  }
  return image;
}
function readEmployeeImageFromForm(form) {
  const hidden = form.querySelector("#employeeImageValue");
  let image = String(hidden?.value || "").trim();
  if (image.startsWith("data:image/svg")) image = "";
  if (!image) {
    const preview = form.querySelector("#employeeImagePreview");
    const src = String(preview?.currentSrc || preview?.src || "").trim();
    if (
      src.startsWith("data:image/") ||
      src.startsWith("/media/") ||
      src.startsWith("http")
    ) {
      image = src;
    }
  }
  return image;
}
function readCustomerImageFromForm(form) {
  const hidden = form.querySelector("#customerImageValue");
  let image = String(hidden?.value || "").trim();
  if (image.startsWith("data:image/svg")) image = "";
  if (!image) {
    const preview = form.querySelector("#customerImagePreview");
    const src = String(preview?.currentSrc || preview?.src || "").trim();
    if (
      src.startsWith("data:image/") ||
      src.startsWith("/media/") ||
      src.startsWith("http")
    ) {
      image = src;
    }
  }
  return image;
}
async function saveProductImagePayload(productId, payload) {
  const res = await fetch(
    `${API_BASE}/products/${encodeURIComponent(productId)}/image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...payload,
        actor: state.currentEmployee
          ? {
              id: state.currentEmployee.id,
              email: state.currentEmployee.email,
            }
          : null,
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    let msg = "Зураг хадгалж чадсангүй";
    try {
      const err = await res.json();
      if (err?.detail) msg = String(err.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const result = await res.json();
  if (result.updatedAt) serverUpdatedAt = result.updatedAt;
  return result.url || "";
}
async function uploadProductImage(productId, dataUrl) {
  return saveProductImagePayload(productId, { image: dataUrl });
}
async function saveProfileImagePayload(profileKind, entityId, dataUrl) {
  const segment =
    profileKind === "employee"
      ? "employees"
      : profileKind === "customer"
        ? "customers"
        : "";
  if (!segment) throw new Error("Зурагны төрөл буруу байна");
  const res = await fetch(
    `${API_BASE}/${segment}/${encodeURIComponent(entityId)}/image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        image: dataUrl,
        actor: state.currentEmployee
          ? {
              id: state.currentEmployee.id,
              email: state.currentEmployee.email,
            }
          : null,
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    let msg = "Зураг хадгалж чадсангүй";
    try {
      const err = await res.json();
      if (err?.detail) msg = String(err.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const result = await res.json();
  if (result.updatedAt) serverUpdatedAt = result.updatedAt;
  return result.url || "";
}
async function uploadEmployeeImage(employeeId, dataUrl) {
  return saveProfileImagePayload("employee", employeeId, dataUrl);
}
async function uploadCustomerImage(customerId, dataUrl) {
  return saveProfileImagePayload("customer", customerId, dataUrl);
}
async function persistProfileImageToMedia(entity, profileKind) {
  const entityId = String(entity?.id || "").trim();
  const image = String(entity?.image || "").trim();
  if (!entityId || !image) return "";
  if (!image.startsWith("data:image/")) return image;
  try {
    const url =
      profileKind === "employee"
        ? await uploadEmployeeImage(entityId, image)
        : profileKind === "customer"
          ? await uploadCustomerImage(entityId, image)
          : "";
    if (url) {
      entity.image = url;
      if (state.currentEmployee?.id === entityId) {
        state.currentEmployee.image = url;
        saveAuthSession();
      }
    }
    return url || "";
  } catch (error) {
    console.warn("Profile image upload failed", error);
    return "";
  }
}
function storedEntityImage(item) {
  const raw = String(item?.image || "").trim();
  if (!raw || raw.startsWith("data:image/svg")) return "";
  return raw;
}
function entityImageSrc(image) {
  const raw = storedEntityImage({ image });
  if (!raw) return "";
  return resolveBackendAssetUrl(raw) || raw;
}
async function mirrorProductImage(productId, sourceUrl) {
  return saveProductImagePayload(productId, { sourceUrl });
}
async function fetchImageAsDataUrl(url) {
  const source = String(url || "").trim();
  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    throw new Error("Зурагны холбоос буруу байна");
  }
  const res = await fetch(source, { cache: "no-store" });
  if (!res.ok) throw new Error("Зураг татаж чадсангүй");
  const blob = await res.blob();
  if (!String(blob.type || "").startsWith("image/")) {
    throw new Error("Зурагны формат буруу байна");
  }
  if (blob.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("Зураг хэт том байна. Жижиг зураг сонгоно уу.");
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Зураг уншиж чадсангүй"));
    reader.readAsDataURL(blob);
  });
}
const LOCAL_PENDING_STATE_KEY = "tomuda-pending-state";
const LOCAL_ORDERS_BACKUP_KEY = "tomuda-orders-backup";
function readLocalBackendCache() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKEND_CACHE_KEY);
    if (!raw || raw.length > LOCAL_BACKEND_CACHE_MAX_BYTES) return null;
    const parsed = JSON.parse(raw);
    const savedAt = Date.parse(parsed?.savedAt || "");
    if (!parsed?.state || typeof parsed.state !== "object") return null;
    if (!Number.isFinite(savedAt)) return null;
    if (Date.now() - savedAt > LOCAL_BACKEND_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveLocalBackendCache(payload) {
  if (!payload?.state) return;
  try {
    const snapshot = {
      state: payload.state,
      updatedAt: payload.updatedAt || "",
      savedAt: new Date().toISOString(),
    };
    const raw = JSON.stringify(snapshot);
    if (raw.length > LOCAL_BACKEND_CACHE_MAX_BYTES) return;
    localStorage.setItem(LOCAL_BACKEND_CACHE_KEY, raw);
  } catch (error) {
    console.warn("Backend cache save failed", error);
  }
}
function mergeBootState(serverState) {
  const pendingState = readLocalPendingState();
  const ordersBackup = readLocalOrdersBackup();
  if (!pendingState && !ordersBackup.length) return serverState;
  return mergeBootPersistentState(serverState, pendingState, ordersBackup);
}
function saveLocalPendingState() {
  if (
    !localStateDirty() &&
    !backendSaveTimer &&
    !backendSaving &&
    !backendSaveFailedMessage
  ) {
    clearLocalPendingState();
    return;
  }
  try {
    localStorage.setItem(
      LOCAL_PENDING_STATE_KEY,
      JSON.stringify({
        state: persistentState(),
        savedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn("Local pending state save failed", error);
  }
}
function saveLocalOrdersBackup() {
  try {
    localStorage.setItem(
      LOCAL_ORDERS_BACKUP_KEY,
      JSON.stringify({
        orders: retainedOrders(state.orders || []),
        savedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn("Local orders backup failed", error);
  }
}
function readLocalPendingState() {
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state && typeof parsed.state === "object"
      ? parsed.state
      : null;
  } catch {
    return null;
  }
}
function readLocalOrdersBackup() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return retainedOrders(Array.isArray(parsed?.orders) ? parsed.orders : []);
  } catch {
    return [];
  }
}
function clearLocalPendingState() {
  try {
    localStorage.removeItem(LOCAL_PENDING_STATE_KEY);
  } catch {
    /* ignore */
  }
}
function clearLocalOrdersBackup() {
  try {
    localStorage.removeItem(LOCAL_ORDERS_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}
function clearOrderPersistenceCache() {
  clearLocalPendingState();
  clearLocalOrdersBackup();
}
function persistOrderSnapshot() {
  const shouldPersist =
    localStateDirty() ||
    !!backendSaveTimer ||
    backendSaving ||
    !!backendSaveFailedMessage;
  saveLocalPendingState();
  if (shouldPersist) saveLocalOrdersBackup();
  else clearLocalOrdersBackup();
}
function mergeBootPersistentState(backendState, pendingState, ordersBackup) {
  let merged = mergePersistentStates(backendState, pendingState || {});
  if (ordersBackup.length) {
    merged.orders = retainedOrders(mergeArrayById(merged.orders, ordersBackup));
  }
  return merged;
}
const MERGE_BY_ID_KEYS = ["customers", "products", "employees", "orders"];
const DELETION_GUARDED_KEYS = ["customers", "products", "employees", "orders"];

function deletionKeyForCollection(collectionKey) {
  if (collectionKey === "customers") return "customer";
  if (collectionKey === "products") return "product";
  if (collectionKey === "employees") return "employee";
  if (collectionKey === "orders") return "order";
  return collectionKey;
}
function normalizeDeletionLog(log = []) {
  if (!Array.isArray(log)) return [];
  const seen = new Set();
  return log
    .filter((entry) => entry && entry.type && entry.id)
    .filter((entry) => {
      const key = `${entry.type}:${entry.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-500);
}
function deletionLogHas(log = [], type, id) {
  return normalizeDeletionLog(log).some(
    (entry) => entry.type === type && String(entry.id) === String(id),
  );
}
function mergedDeletionLog(remote = {}, local = {}) {
  return normalizeDeletionLog([
    ...(remote.deletionLog || []),
    ...(local.deletionLog || []),
  ]);
}
function mergeArrayById(remote = [], local = [], opts = {}) {
  const preferRemote = !!opts.preferRemote && !localStateDirty();
  const map = new Map();
  const first = preferRemote ? local : remote;
  const second = preferRemote ? remote : local;
  (first || []).forEach((item) => {
    if (item?.id != null) map.set(String(item.id), item);
  });
  (second || []).forEach((item) => {
    if (item?.id != null) map.set(String(item.id), item);
  });
  const tombstones = opts.deletionLog || [];
  if (opts.deletionType) {
    for (const id of [...map.keys()]) {
      if (deletionLogHas(tombstones, opts.deletionType, id)) map.delete(id);
    }
  }
  return Array.from(map.values());
}

function promotionRuleFingerprint(rule) {
  if (!rule || typeof rule !== "object") return JSON.stringify(rule);
  const copy = { ...rule };
  delete copy.freeProductId;
  for (const key of [
    "buyProductIds",
    "freeProductIds",
    "priceFreeProductIds",
    "paymentFreeProductIds",
  ]) {
    if (Array.isArray(copy[key])) {
      copy[key] = [...copy[key]].map(String).filter(Boolean).sort();
    }
  }
  const ordered = {};
  Object.keys(copy)
    .sort()
    .forEach((key) => {
      ordered[key] = copy[key];
    });
  return JSON.stringify(ordered);
}
// Canonical fingerprint: stable no matter which legacy/alternate keys the
// rule uses for its free products, so the same logical rule always matches.
function promotionRuleCanonicalFingerprint(rule) {
  if (!rule || typeof rule !== "object") return JSON.stringify(rule);
  const copy = { ...rule };
  const freeIds = promotionFreeProductIds(rule)
    .map(String)
    .filter(Boolean)
    .sort();
  delete copy.freeProductId;
  delete copy.priceFreeProductId;
  delete copy.paymentFreeProductId;
  delete copy.priceFreeProductIds;
  delete copy.paymentFreeProductIds;
  copy.freeProductIds = freeIds;
  if (Array.isArray(copy.buyProductIds)) {
    copy.buyProductIds = [...copy.buyProductIds]
      .map(String)
      .filter(Boolean)
      .sort();
  }
  const ordered = {};
  Object.keys(copy)
    .sort()
    .forEach((key) => {
      ordered[key] = copy[key];
    });
  return JSON.stringify(ordered);
}
function dedupePromotionRuleList(list = []) {
  const seen = new Set();
  const merged = [];
  for (const item of list || []) {
    const key = promotionRuleCanonicalFingerprint(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
function promotionDeletionKey(kind, ruleOrFingerprint) {
  const fp =
    typeof ruleOrFingerprint === "string"
      ? ruleOrFingerprint
      : promotionRuleFingerprint(ruleOrFingerprint);
  return `${kind}:${fp}`;
}
// Fingerprints are JSON strings of the rule, so old entries recorded from a
// legacy/alternate rule shape can be re-canonicalized by parsing them back.
function promotionDeletionCanonicalKey(kind, fingerprint) {
  let fp = String(fingerprint);
  try {
    fp = promotionRuleCanonicalFingerprint(JSON.parse(fp));
  } catch {
    /* keep raw fingerprint */
  }
  return `${kind}:${fp}`;
}
function normalizePromotionDeletionLog(log = []) {
  if (!Array.isArray(log)) return [];
  // Keep only the newest entry per logical rule so a later "restored" entry
  // overrides older delete tombstones (and vice versa) across devices.
  const byKey = new Map();
  for (const entry of log) {
    if (!entry?.kind || !entry?.fingerprint) continue;
    const norm = {
      kind: String(entry.kind),
      fingerprint: String(entry.fingerprint),
      deletedBy: String(entry.deletedBy || ""),
      deletedAt: entry.deletedAt || "",
      restored: !!entry.restored,
      updatedAt: String(entry.updatedAt || entry.deletedAt || ""),
    };
    const key = promotionDeletionCanonicalKey(norm.kind, norm.fingerprint);
    const prev = byKey.get(key);
    if (!prev || norm.updatedAt >= prev.updatedAt) byKey.set(key, norm);
  }
  return [...byKey.values()].slice(-500);
}
function mergedPromotionDeletionLog(remote = {}, local = {}) {
  const remoteLog = normalizePromotionDeletionLog(
    remote.promotionDeletionLog || [],
  );
  const merged = normalizePromotionDeletionLog([
    ...remoteLog,
    ...(local.promotionDeletionLog || []),
  ]);
  const remoteKeys = new Set(
    remoteLog.map((e) => promotionDeletionCanonicalKey(e.kind, e.fingerprint)),
  );
  const remoteRules = normalizePromotionRulesState(remote.promotionRules || {});
  const FRESH_MS = 10 * 60 * 1000;
  const now = Date.now();
  return merged.map((entry) => {
    if (entry.restored) return entry;
    const key = promotionDeletionCanonicalKey(entry.kind, entry.fingerprint);
    // Deletion the backend already knows about: keep it.
    if (remoteKeys.has(key)) return entry;
    // Recent local deletion (e.g. made offline) that hasn't synced yet: keep.
    const ts = Date.parse(entry.updatedAt || entry.deletedAt || "");
    if (Number.isFinite(ts) && now - ts < FRESH_MS) return entry;
    // Stale local-only tombstone while the backend still has the rule alive:
    // this deletion never propagated legitimately, so restore the rule
    // instead of silently re-deleting it on this device.
    const ruleAlive = (remoteRules[entry.kind] || []).some(
      (rule) =>
        key === `${entry.kind}:${promotionRuleCanonicalFingerprint(rule)}`,
    );
    if (!ruleAlive) return entry;
    return { ...entry, restored: true, updatedAt: new Date().toISOString() };
  });
}
function promotionDeletionLogHas(log = [], kind, rule) {
  const key =
    typeof rule === "string"
      ? promotionDeletionCanonicalKey(kind, rule)
      : `${kind}:${promotionRuleCanonicalFingerprint(rule)}`;
  return normalizePromotionDeletionLog(log).some(
    (entry) =>
      !entry.restored &&
      promotionDeletionCanonicalKey(entry.kind, entry.fingerprint) === key,
  );
}
function recordPromotionDeletion(kind, rule) {
  if (!kind || !rule) return;
  const now = new Date().toISOString();
  state.promotionDeletionLog = normalizePromotionDeletionLog([
    ...(state.promotionDeletionLog || []),
    {
      kind,
      fingerprint: promotionRuleCanonicalFingerprint(rule),
      deletedBy: state.currentEmployee?.id || "",
      deletedAt: now,
      restored: false,
      updatedAt: now,
    },
  ]);
}
function clearPromotionDeletion(kind, rule) {
  if (!promotionDeletionLogHas(state.promotionDeletionLog, kind, rule)) return;
  // Do NOT drop the tombstone: write a newer "restored" entry instead so the
  // restore survives merges with stale copies of the log on other devices.
  const now = new Date().toISOString();
  state.promotionDeletionLog = normalizePromotionDeletionLog([
    ...(state.promotionDeletionLog || []),
    {
      kind,
      fingerprint: promotionRuleCanonicalFingerprint(rule),
      deletedBy: state.currentEmployee?.id || "",
      deletedAt: now,
      restored: true,
      updatedAt: now,
    },
  ]);
}
function mergeRuleArrays(remote = [], local = []) {
  return dedupePromotionRuleList([...(remote || []), ...(local || [])]);
}
function mergePromotionRuleKind(
  kind,
  remoteList = [],
  localList = [],
  deletionLog = [],
) {
  const remote = remoteList || [];
  const local = localList || [];
  return mergeRuleArrays(remote, local).filter(
    (rule) => !promotionDeletionLogHas(deletionLog, kind, rule),
  );
}
function mergePromotionRules(remote = {}, local = {}, deletionLog = []) {
  const merged = {
    quantity: mergePromotionRuleKind(
      "quantity",
      remote.quantity,
      local.quantity,
      deletionLog,
    ),
    price: mergePromotionRuleKind(
      "price",
      remote.price,
      local.price,
      deletionLog,
    ),
    payment: mergePromotionRuleKind(
      "payment",
      remote.payment,
      local.payment,
      deletionLog,
    ),
  };
  return normalizePromotionRulesState(merged);
}
function appendPromotionRule(kind, rule) {
  if (!state.promotionRules || typeof state.promotionRules !== "object") {
    state.promotionRules = { quantity: [], price: [], payment: [] };
  }
  if (!Array.isArray(state.promotionRules[kind]))
    state.promotionRules[kind] = [];
  const key = promotionRuleCanonicalFingerprint(rule);
  if (
    state.promotionRules[kind].some(
      (item) => promotionRuleCanonicalFingerprint(item) === key,
    )
  ) {
    return false;
  }
  clearPromotionDeletion(kind, rule);
  state.promotionRules[kind].push(rule);
  state.promotionRules[kind] = dedupePromotionRuleList(
    state.promotionRules[kind],
  );
  return true;
}
function resetPromotionModalDraft(kind) {
  state.promoPick = null;
  state.promoFormDraft = null;
  state.promoModalKind = "";
  resetPromoPickListScroll();
  if (kind === "quantity" || kind === "all") {
    state.searches.promo_buyProductIds = "";
    state.searches.promo_freeProductIds = "";
    state.searches.promo_buyProductIds_category = "all";
    state.searches.promo_freeProductIds_category = "all";
  }
  if (kind === "price" || kind === "all") {
    state.searches.promo_priceFreeProductIds = "";
    state.searches.promo_priceFreeProductIds_category = "all";
  }
  if (kind === "payment" || kind === "all") {
    state.searches.promo_paymentFreeProductIds = "";
    state.searches.promo_paymentFreeProductIds_category = "all";
  }
}
function finishPromotionSave(kind) {
  const msg =
    kind === "quantity"
      ? "Багц худалдан авалтын хөнгөлөлт хадгалагдлаа"
      : kind === "price"
        ? "Үнийн урамшуулал хадгалагдлаа"
        : kind === "payment"
          ? "Төлбөрийн урамшуулал хадгалагдлаа"
          : "Урамшуулал хадгалагдлаа";
  resetPromotionModalDraft(kind);
  closeModal();
  render();
  showAppToast(msg, "success");
  criticalBackendSave();
}

function countSessionMs(at) {
  const ms = new Date(at || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
function applyCountSessionMerge(remote, local, merged) {
  const src =
    countSessionMs(local.countSessionStartedAt) >=
    countSessionMs(remote.countSessionStartedAt)
      ? local
      : remote;
  merged.countQty = { ...(src.countQty || {}) };
  merged.countOpeningStock = { ...(src.countOpeningStock || {}) };
  merged.countSessionStartedAt = src.countSessionStartedAt ?? null;
  merged.countDone = !!src.countDone;
}
function mergePersistentStates(remote = {}, local = {}) {
  const merged = {};
  const deletionLog = mergedDeletionLog(remote, local);
  const promotionDeletionLog = mergedPromotionDeletionLog(remote, local);
  for (const key of MERGE_BY_ID_KEYS) {
    const mergeFn =
      key === "products" || key === "customers" || key === "employees"
        ? mergeEntityRecords
        : mergeArrayById;
    merged[key] = mergeFn(remote[key], local[key], {
      deletionLog,
      deletionType: DELETION_GUARDED_KEYS.includes(key)
        ? deletionKeyForCollection(key)
        : "",
      entityKind: key,
      preferRemote: true,
    });
    if (key === "orders") merged[key] = retainedOrders(merged[key]);
  }
  merged.deletionLog = deletionLog;
  merged.promotionDeletionLog = promotionDeletionLog;
  applyCountSessionMerge(remote, local, merged);
  for (const key of persistKeys) {
    if (MERGE_BY_ID_KEYS.includes(key)) continue;
    if (
      key === "countQty" ||
      key === "countOpeningStock" ||
      key === "countSessionStartedAt" ||
      key === "countDone"
    ) {
      continue;
    }
    if (key === "promotionRules") {
      merged.promotionRules = mergePromotionRules(
        remote.promotionRules,
        local.promotionRules,
        promotionDeletionLog,
      );
      continue;
    }
    if (key === "settings") {
      merged.settings = {
        ...(remote.settings || {}),
        ...(local.settings || {}),
      };
      continue;
    }
    if (key === "extraCategories") {
      merged.extraCategories = [
        ...new Set([
          ...(remote.extraCategories || []),
          ...(local.extraCategories || []),
        ]),
      ];
      continue;
    }
    if (key === "inventoryLogs") {
      merged.inventoryLogs = mergeArrayById(
        remote.inventoryLogs,
        local.inventoryLogs,
        { preferRemote: true },
      );
      continue;
    }
    if (key === "stockInReceipts") {
      merged.stockInReceipts = mergeArrayById(
        remote.stockInReceipts,
        local.stockInReceipts,
        { preferRemote: true },
      );
      continue;
    }
    if (key === "deletionLog" || key === "promotionDeletionLog") continue;
    merged[key] =
      local[key] !== undefined && local[key] !== null
        ? local[key]
        : remote[key];
  }
  return merged;
}
function protectAccidentalDeletions(data) {
  let baseline = null;
  try {
    baseline = JSON.parse(backendLastSaved).state;
  } catch {
    return data;
  }
  if (!baseline) return data;
  const protectedData = { ...data };
  const deletionLog = normalizeDeletionLog([
    ...(baseline.deletionLog || []),
    ...(protectedData.deletionLog || []),
  ]);
  protectedData.deletionLog = deletionLog;
  const promotionDeletionLog = mergedPromotionDeletionLog(
    baseline,
    protectedData,
  );
  protectedData.promotionDeletionLog = promotionDeletionLog;
  protectedData.promotionRules = mergePromotionRules(
    baseline.promotionRules,
    protectedData.promotionRules,
    promotionDeletionLog,
  );
  for (const key of DELETION_GUARDED_KEYS) {
    const current = protectedData[key] || [];
    const base = baseline[key] || [];
    const currentIds = new Set(current.map((x) => x.id));
    const deletionType = deletionKeyForCollection(key);
    const restored = base.filter(
      (x) =>
        !currentIds.has(x.id) &&
        !deletionLogHas(deletionLog, deletionType, x.id),
    );
    if (restored.length) protectedData[key] = [...current, ...restored];
  }
  if (!canDelete()) {
    for (const key of ["employees"]) {
      const current = protectedData[key] || [];
      const base = baseline[key] || [];
      const currentIds = new Set(current.map((x) => x.id));
      const restored = base.filter((x) => !currentIds.has(x.id));
      if (restored.length) protectedData[key] = [...current, ...restored];
    }
  }
  if (baseline.orders && protectedData.orders) {
    const baseMap = Object.fromEntries(baseline.orders.map((o) => [o.id, o]));
    protectedData.orders = protectedData.orders.map((o) => {
      const base = baseMap[o.id];
      if (base && base.status !== "cancelled" && o.status === "cancelled") {
        return { ...o, status: base.status };
      }
      return o;
    });
    const currentOrderIds = new Set(protectedData.orders.map((o) => o.id));
    const restoredOrders = baseline.orders.filter(
      (o) => !currentOrderIds.has(o.id) && orderWithinRetention(o),
    );
    if (restoredOrders.length) {
      protectedData.orders = [...protectedData.orders, ...restoredOrders];
    }
    protectedData.orders = retainedOrders(protectedData.orders);
  }
  return protectedData;
}
function applyPersistentState(data) {
  if (!data || typeof data !== "object") return false;
  persistKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) state[key] = data[key];
  });
  if (!state.promotionRules || typeof state.promotionRules !== "object") {
    state.promotionRules = { quantity: [], price: [], payment: [] };
  } else {
    state.promotionRules = normalizePromotionRulesState(state.promotionRules);
    for (const kind of ["quantity", "price", "payment"]) {
      state.promotionRules[kind] = (state.promotionRules[kind] || []).filter(
        (rule) =>
          !promotionDeletionLogHas(state.promotionDeletionLog, kind, rule),
      );
    }
  }
  if (!state.workerQty || typeof state.workerQty !== "object")
    state.workerQty = {};
  if (!Array.isArray(state.stockInReceipts)) state.stockInReceipts = [];
  state.deletionLog = normalizeDeletionLog(state.deletionLog);
  state.promotionDeletionLog = normalizePromotionDeletionLog(
    state.promotionDeletionLog,
  );
  ensureSettings();
  ensureEmployeePercentDiscount();
  ensureEmployeePermissions();
  syncCurrentEmployeeFromState();
  ensureDeliverySelection();
  state.orders = retainedOrders(state.orders);
  normalizeOrderReceiptNumbers();
  normalizeOrderPayments();
  normalizeOrderDeliveryDates();
  normalizeOrderTotals();
  return true;
}
function localStateDirty() {
  return backendStateSnapshot() !== backendLastSaved;
}
function shouldDeferBackendSync() {
  if (isLoginFormActive()) return true;
  if (isEditingCountQty()) return true;
  if (isWarehouseDateEditing()) return true;
  if (isEditingSettlementText()) return true;
  if (isWhReceiptPickerOpen()) return true;
  if (isReceiptStatusSelecting()) return true;
  if (isToolbarSelectActive()) return true;
  if (isUserScrolling()) return true;
  if (
    state.currentView === "count" &&
    (state.countDone || countSessionActive())
  ) {
    return true;
  }
  if (stockInSaveLock) return true;
  if (stockInSessionActive() && stockInHasEntries()) return true;
  return false;
}
function isUserScrolling() {
  return Date.now() < userScrollActiveUntil;
}
function markUserScrollActive() {
  userScrollActiveUntil = Date.now() + 2000;
}
function isToolbarSelectActive() {
  if (Date.now() < toolbarSelectActiveUntil) return true;
  const el = document.activeElement;
  return !!el?.matches?.(
    ".page-toolbar__select, .page-toolbar__search, select.app-input, .worker-orders-filters select, .worker-orders-filters input[type=date]",
  );
}
function toolbarSelectFocus() {
  clearTimeout(toolbarSelectBlurTimer);
  toolbarSelectActiveUntil = Date.now() + 60000;
}
function toolbarSelectBlur() {
  clearTimeout(toolbarSelectBlurTimer);
  toolbarSelectBlurTimer = setTimeout(() => {
    toolbarSelectActiveUntil = 0;
    if (toolbarSelectRenderPending) {
      toolbarSelectRenderPending = false;
      render();
    }
  }, 400);
}
function pageToolbarSelectHandlers() {
  return ` onfocus="toolbarSelectFocus()" onblur="toolbarSelectBlur()" ontouchstart="toolbarSelectFocus()"`;
}
function setProductCategory(value) {
  state.filters.category = value || "all";
  render();
}
function setOrderStatusFilter(value) {
  state.filters.order = value || "all";
  render();
}
function setWorkerPayFilter(value) {
  state.filters.workerPay = value || "all";
  render();
}
function syncBackendSaveMarker(stateData = null) {
  backendLastSaved = backendStateSnapshot(stateData || persistentState());
}
function captureSessionSnapshot() {
  return {
    isLoggedIn: state.isLoggedIn,
    currentEmployee: state.currentEmployee,
    currentView: state.currentView,
    mobileOpen: state.mobileOpen,
    searches: { ...state.searches },
    filters: { ...state.filters },
    selectedWorkers: [...(state.selectedWorkers || [])],
    selectedWarehouseOrderId: state.selectedWarehouseOrderId,
    receiptPrintWorkerIds: [...(state.receiptPrintWorkerIds || [])],
    receiptPrintWorkerPickerOpen: !!state.receiptPrintWorkerPickerOpen,
    receiptPrintDeliveryId: state.receiptPrintDeliveryId || "",
    receiptPrintDeliveryPickerOpen: !!state.receiptPrintDeliveryPickerOpen,
    receiptPrintOrderIds: [...(state.receiptPrintOrderIds || [])],
    receiptPrintWorkerSyncKey: state.receiptPrintWorkerSyncKey || "",
    selectedDeliveryId: state.selectedDeliveryId,
    workerStoreReady: state.workerStoreReady,
    pickerStatus: state.pickerStatus,
    pickerBarcode: state.pickerBarcode,
    deliveryName: state.deliveryName,
    deliveryPhone: state.deliveryPhone,
  };
}
function restoreSessionSnapshot(session) {
  Object.assign(state, session);
}
function syncBackendMarkers(payload, stateData) {
  if (stateData) applyPersistentState(stateData);
  syncBackendSaveMarker();
  if (payload?.updatedAt) serverUpdatedAt = payload.updatedAt;
}
function applyBootBackendPayload(payload) {
  if (!payload?.state) return false;
  const merged = mergeBootState(payload.state);
  applyPersistentState(merged);
  syncBackendSaveMarker();
  if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
  if (!localStateDirty()) clearOrderPersistenceCache();
  return true;
}
function isEditingCountQty() {
  const el = document.activeElement;
  return (
    state.currentView === "count" &&
    el?.matches?.(".count-row__input[data-count-product-id]")
  );
}
function isWarehouseDateEditing() {
  if (Date.now() < warehouseDatePickerActiveUntil) return true;
  const el = document.activeElement;
  return el?.matches?.(".wh-date-filters__native");
}
function isReceiptStatusSelecting() {
  if (Date.now() < receiptStatusSelectActiveUntil) return true;
  const el = document.activeElement;
  return el?.matches?.(".wh-receipts__filter");
}
function isEditingSettlementText() {
  const el = document.activeElement;
  return (
    !!el &&
    (el.matches?.("[data-settlement-input]") ||
      el.matches?.(".worker-order-opt__input"))
  );
}
function isEditingLoginForm() {
  const el = document.activeElement;
  return !!el?.closest?.(".auth-form");
}
function armLoginFormGuard(ms = 600000) {
  loginFormActiveUntil = Date.now() + ms;
}
function isLoginFormActive() {
  if (Date.now() < loginFormActiveUntil) return true;
  return isEditingLoginForm();
}
function captureLoginFormSnapshot() {
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const remember = document.getElementById("loginRemember");
  if (!email && !password) return null;
  return {
    email: email?.value || "",
    password: password?.value || "",
    remember: !!remember?.checked,
    focusId:
      document.activeElement?.id === "loginEmail" ||
      document.activeElement?.id === "loginPassword"
        ? document.activeElement.id
        : "",
    selectionStart:
      document.activeElement?.selectionStart == null
        ? null
        : document.activeElement.selectionStart,
    selectionEnd:
      document.activeElement?.selectionEnd == null
        ? null
        : document.activeElement.selectionEnd,
  };
}
function restoreLoginFormSnapshot(snapshot) {
  if (!snapshot) return;
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const remember = document.getElementById("loginRemember");
  if (email) email.value = snapshot.email;
  if (password) password.value = snapshot.password;
  if (remember) remember.checked = snapshot.remember;
  const focusEl = snapshot.focusId
    ? document.getElementById(snapshot.focusId)
    : null;
  if (!focusEl) return;
  requestAnimationFrame(() => {
    focusEl.focus({ preventScroll: true });
    if (
      snapshot.selectionStart != null &&
      snapshot.selectionEnd != null &&
      typeof focusEl.setSelectionRange === "function"
    ) {
      try {
        focusEl.setSelectionRange(
          snapshot.selectionStart,
          snapshot.selectionEnd,
        );
      } catch (e) {}
    }
  });
}
function bindLoginFormGuard() {
  const form = document.querySelector(".auth-form");
  if (!form) return;
  if (!form.dataset.guardBound) {
    form.dataset.guardBound = "1";
    const arm = () => armLoginFormGuard();
    form.addEventListener("focusin", arm);
    form.addEventListener("input", arm);
    form.addEventListener("touchstart", arm, { passive: true });
    form.addEventListener("pointerdown", arm, { passive: true });
  }
  loginFormGuardBound = true;
}
function mountLoginView(force = false) {
  const existing = app.querySelector(".auth-screen");
  if (!force && existing) {
    bindLoginFormGuard();
    return;
  }
  const snapshot = force ? null : captureLoginFormSnapshot();
  app.innerHTML = loginView();
  bindLoginFormGuard();
  restoreLoginFormSnapshot(snapshot);
}
function isWhReceiptPickerOpen() {
  return !!(
    state.receiptPrintWorkerPickerOpen ||
    state.receiptPrintDeliveryPickerOpen ||
    state.permissionEmployeePickerOpen
  );
}
function armWhReceiptPickerDismissGuard() {
  whReceiptPickerDismissGuard += 1;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      whReceiptPickerDismissGuard = Math.max(
        0,
        whReceiptPickerDismissGuard - 1,
      );
    });
  });
}
function suppressWhReceiptPickerDismiss(ms) {
  const wait =
    ms != null ? ms : isSamsungDevice() || isAndroidDevice() ? 900 : 360;
  whReceiptPickerSuppressDismissUntil = Date.now() + wait;
}
function shouldSuppressWhReceiptPickerDismiss() {
  return Date.now() < whReceiptPickerSuppressDismissUntil;
}
function whReceiptPickerTriggerAttrs() {
  return ` onpointerdown="armWhReceiptPickerDismissGuard()" ontouchstart="armWhReceiptPickerDismissGuard()"`;
}
function flushPendingWarehouseDateRender() {
  if (isWarehouseDateEditing()) return;
  if (!warehouseDateRenderPending) return;
  warehouseDateRenderPending = false;
  render();
}
function warehouseDateFocus() {
  closeReceiptPrintPickersState();
  closeReceiptPrintPickersVisual();
  warehouseDatePickerActiveUntil = Date.now() + 60000;
}
function warehouseDateBlur() {
  clearTimeout(warehouseDateBlurTimer);
  warehouseDateBlurTimer = setTimeout(() => {
    warehouseDatePickerActiveUntil = 0;
    flushPendingWarehouseDateRender();
  }, 400);
}
function receiptStatusFilterFocus() {
  receiptStatusSelectActiveUntil = Date.now() + 60000;
}
function receiptStatusFilterBlur() {
  setTimeout(() => {
    receiptStatusSelectActiveUntil = 0;
    if (receiptStatusFilterPending) {
      receiptStatusFilterPending = false;
      render();
    }
  }, 300);
}
function setReceiptOrderStatusFilter(value) {
  state.filters.order = value || "all";
  state.selectedWarehouseOrderId = "";
  receiptStatusSelectActiveUntil = 0;
  receiptStatusFilterPending = false;
  render();
}
function closeReceiptPrintPickersVisual() {
  document.querySelectorAll(".wh-receipt-picker.is-open").forEach((picker) => {
    picker.classList.remove("is-open");
    const trigger = picker.querySelector(".wh-receipt-picker__trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    picker.querySelector(".wh-receipt-picker__panel")?.remove();
  });
}
function closeReceiptPrintPickersState() {
  state.receiptPrintWorkerPickerOpen = false;
  state.receiptPrintDeliveryPickerOpen = false;
  state.permissionEmployeePickerOpen = false;
}
function safeRender() {
  if (!state.isLoggedIn && isLoginFormActive()) return;
  if (isEditingCountQty()) {
    countRenderPending = true;
    return;
  }
  if (isWarehouseDateEditing()) {
    warehouseDateRenderPending = true;
    return;
  }
  if (isReceiptStatusSelecting()) {
    receiptStatusFilterPending = true;
    return;
  }
  if (isToolbarSelectActive()) {
    toolbarSelectRenderPending = true;
    return;
  }
  if (isUserScrolling()) return;
  if (isEditingSettlementText()) return;
  countRenderPending = false;
  warehouseDateRenderPending = false;
  receiptStatusFilterPending = false;
  render();
}
function flushPendingCountRender() {
  if (!countRenderPending || isEditingCountQty()) return;
  countRenderPending = false;
  render();
}
function applyRemoteState(payload) {
  if (!payload?.state) return false;
  if (shouldDeferBackendSync()) return false;
  const merged = protectAccidentalDeletions(
    mergePersistentStates(payload.state, persistentState()),
  );
  if (JSON.stringify(merged) === JSON.stringify(persistentState())) {
    if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
    return false;
  }
  const session = captureSessionSnapshot();
  const pickerCategory = state.filters.workerCategory;
  const reopenPicker = pickerOpen();
  applyPersistentState(merged);
  restoreSessionSnapshot(session);
  ensureEmployeeEmails();
  ensureEmployeePercentDiscount();
  normalizeOrderReceiptNumbers();
  normalizeOrderPayments();
  normalizeOrderDeliveryDates();
  normalizeOrderTotals();
  if (JSON.stringify(stateForBackendSave()) !== JSON.stringify(payload.state)) {
    if (canAutoSaveBackendState()) scheduleBackendSave();
    else syncBackendSaveMarker();
  } else {
    syncBackendSaveMarker();
  }
  if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
  saveLocalBackendCache({ state: merged, updatedAt: payload.updatedAt || "" });
  if (!state.isLoggedIn) return true;
  safeRender();
  if (reopenPicker && pickerCategory) {
    state.filters.workerCategory = pickerCategory;
    pickerModal();
  }
  return true;
}
async function fetchBackendPayload() {
  const res = await fetch(`${API_BASE}/state`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
async function pollBackendState() {
  if (
    !backendReady ||
    backendSaving ||
    backendSaveTimer ||
    importLoading ||
    stockInSaveLock
  )
    return;
  if (shouldDeferBackendSync()) return;
  try {
    const payload = await fetchBackendPayload();
    if (!payload?.updatedAt) return;
    if (!serverUpdatedAt) {
      serverUpdatedAt = payload.updatedAt;
      return;
    }
    if (payload.updatedAt === serverUpdatedAt) return;
    applyRemoteState(payload);
  } catch (error) {
    console.warn("Backend poll failed", error);
  }
}
function startBackendPoll() {
  stopBackendPoll();
  backendPollTimer = setInterval(pollBackendState, BACKEND_POLL_MS);
  document.addEventListener("visibilitychange", onVisibilityPoll);
  window.addEventListener("focus", onVisibilityPoll);
}
function stopBackendPoll() {
  if (backendPollTimer) clearInterval(backendPollTimer);
  backendPollTimer = null;
  document.removeEventListener("visibilitychange", onVisibilityPoll);
  window.removeEventListener("focus", onVisibilityPoll);
}
function onVisibilityPoll() {
  if (document.visibilityState === "visible") pollBackendState();
}
function bootScreenHtml(message = BOOT_LOADING_TEXT, showRetry = false) {
  return `<div class="boot-screen${showRetry ? " boot-screen--error" : ""}" aria-live="polite"><div class="boot-screen__card" role="status"><div class="boot-screen__brand"><img src="${BRAND.logoBlue}" alt="" class="boot-screen__logo" width="52" height="52" decoding="async"><div class="boot-screen__brand-copy"><p class="boot-screen__brand-name">ТОМУДА</p><p class="boot-screen__brand-sub">Импорт, түгээлт</p></div></div><div class="boot-screen__copy"><p id="boot-title" class="boot-screen__title">${BOOT_TITLE_TEXT}</p><p id="boot-detail" class="boot-screen__detail">${esc(message)}</p></div><div class="boot-screen__progress" aria-hidden="true"><span></span></div><div class="boot-screen__status-row" aria-hidden="true"><span class="boot-screen__pulse"></span><span>Сервертэй холбогдож байна</span></div><div class="boot-screen__preview" aria-hidden="true"><span class="boot-screen__preview-row"></span><span class="boot-screen__preview-row"></span><span class="boot-screen__preview-row"></span></div><button type="button" id="boot-retry" class="boot-screen__retry${showRetry ? "" : " hidden"}" onclick="location.reload()">Дахин оролдох</button></div></div>`;
}
function showBootRetry() {
  document.querySelector(".boot-screen")?.classList.add("boot-screen--error");
  document.getElementById("boot-retry")?.classList.remove("hidden");
}
function completeBootUiInit(options = {}) {
  const startPoll = options.startPoll !== false;
  backendReady = true;
  ensureEmployeeEmails();
  ensureSettings();
  ensureEmployeePercentDiscount();
  ensureDeliverySelection();
  normalizeOrderReceiptNumbers();
  normalizeOrderPayments();
  normalizeOrderDeliveryDates();
  normalizeOrderTotals();
  state.workerQty = {};
  restoreAuthSession();
  syncBackendSaveMarker();
  initNoZoom();
  initNestedScrollChain();
  initScrollRenderGuard();
  initPickerModalActions();
  initEmployeeModalActions();
  initQtyStepperButtons();
  initCountInputHandlers();
  initExcelImportHandlers();
  initConfirmCard();
  initConfirmDeleteActions();
  initImageLightbox();
  initProductImageFallback();
  initPageUnloadPersist();
  initAppBack();
  window.__tomudaBooted = true;
  render();
  initPwa();
  if (startPoll) startBackendPoll();
}
async function boot() {
  try {
    app.innerHTML = bootScreenHtml();
    let bootUiReady = false;
    const cached = readLocalBackendCache();
    if (cached?.state) {
      applyBootBackendPayload(cached);
      completeBootUiInit({ startPoll: false });
      bootUiReady = true;
      setBootStatus("Шинэчилж байна", "Серверийн мэдээлэл шалгаж байна...");
    }

    const payload = await fetchBackendStateWithRetry();
    if (payload?.state) {
      applyBootBackendPayload(payload);
      saveLocalBackendCache(payload);
      if (!bootUiReady) {
        completeBootUiInit();
      } else {
        render();
        startBackendPoll();
      }
      return;
    }

    if (bootUiReady) {
      console.warn("Fresh backend state unavailable; using cached copy.");
      startBackendPoll();
      return;
    }

    setBootStatus(
      "Холбогдож чадсангүй",
      "Сервер асаж дуусаагүй байж болно. 1–2 минут хүлээгээд «Дахин оролдох» дарна уу.",
    );
    showBootRetry();
  } catch (err) {
    console.error("Boot failed", err);
    setBootStatus(
      "Алдаа гарлаа",
      "Хуудсыг дахин ачаална уу. Асуудал үргэлжилбэл интернет холболтоо шалгана уу.",
    );
    showBootRetry();
  }
}
function canAppBack() {
  if (!state.isLoggedIn) return false;
  if (imageLightboxOpen()) return true;
  const confirmOverlay = document.getElementById("confirm-card-overlay");
  if (confirmOverlay && !confirmOverlay.hidden) return true;
  if (barcodeScanning) return true;
  if (modal.innerHTML.trim()) return true;
  if (state.mobileOpen) return true;
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerStoreReady
  ) {
    return true;
  }
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer
  ) {
    return true;
  }
  if (state.currentView === "delivery" && currentRole() !== "delivery") {
    return true;
  }
  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    return true;
  }
  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    return true;
  }
  const subAdminViews = [
    "employees",
    "employeePermissions",
    "inventory",
    "reports",
    "promotions",
    "warehouseReceipts",
    "count",
  ];
  if (subAdminViews.includes(state.currentView)) return true;
  const defaultView = defaultViewForRole(currentRole());
  if (state.currentView !== defaultView) return true;
  if (state.currentView === "worker" && state.filters.worker === "orders") {
    return true;
  }
  return false;
}
function leaveWorkerOrdersTab() {
  if (state.currentView !== "worker" || state.filters.worker !== "orders") {
    return false;
  }
  clearWorkerOrderHighlight();
  state.filters.worker = "new";
  render();
  return true;
}
function handleAppBack() {
  if (!state.isLoggedIn) return false;

  const confirmOverlay = document.getElementById("confirm-card-overlay");
  if (confirmOverlay && !confirmOverlay.hidden) {
    closeConfirmCard();
    return true;
  }

  if (imageLightboxOpen()) {
    closeImageLightbox();
    return true;
  }

  if (barcodeScanning) {
    stopBarcodeScan();
    if (pickerOpen()) pickerModal();
    else render();
    return true;
  }

  if (modal.innerHTML.trim()) {
    closeModal();
    return true;
  }

  if (state.mobileOpen) {
    state.mobileOpen = false;
    render();
    return true;
  }

  if (leaveWorkerOrdersTab()) return true;

  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerStoreReady
  ) {
    state.workerStoreReady = false;
    state.workerCustomer = "";
    state.searches.workerStore = "";
    resetWorkerCart();
    render();
    return true;
  }

  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer &&
    !state.workerStoreReady
  ) {
    state.workerCustomer = "";
    render();
    return true;
  }

  if (state.currentView === "delivery" && currentRole() !== "delivery") {
    if (state.deliveryStoreReady) {
      clearDeliveryStore();
      return true;
    }
    go("admin", { silent: true });
    return true;
  }

  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    clearDeliveryStore();
    return true;
  }

  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    state.filters.promotionDetail = "";
    render();
    return true;
  }

  const subAdminViews = [
    "employees",
    "employeePermissions",
    "inventory",
    "reports",
    "promotions",
    "warehouseReceipts",
    "count",
  ];
  if (subAdminViews.includes(state.currentView)) {
    go("admin", { silent: true });
    return true;
  }

  const defaultView = defaultViewForRole(currentRole());
  if (state.currentView !== defaultView) {
    go(defaultView, { silent: true });
    return true;
  }

  return false;
}
function pushAppHistory() {
  if (suppressHistoryPush || !state.isLoggedIn) return;
  history.pushState({ tomudaNav: 1 }, "");
  tombudaHistoryDepth++;
}
function armAppBackGuard() {
  pushAppHistory();
}
function appBack() {
  if (!handleAppBack()) return;
  if (tombudaHistoryDepth > 0) {
    tombudaSkipPopstate = true;
    history.back();
  } else {
    armAppBackGuard();
  }
}
function onAppPopState() {
  if (tombudaSkipPopstate) {
    tombudaSkipPopstate = false;
    tombudaHistoryDepth = Math.max(0, tombudaHistoryDepth - 1);
    return;
  }
  tombudaHistoryDepth = Math.max(0, tombudaHistoryDepth - 1);
  if (handleAppBack()) {
    if (tombudaHistoryDepth === 0) armAppBackGuard();
  } else {
    tryExitApp();
  }
}
function tryExitApp() {
  // Android gestures/back events can be triggered accidentally while working.
  // Keep the app open instead of letting the native wrapper or browser exit.
  showInstallToast("App хаагдахгүй. Цэснээс хэсгээ сонгоно уу.");
  if (tombudaHistoryDepth === 0) armAppBackGuard();
}
function initAppBack() {
  if (window.__tomudaBackReady) return;
  window.__tomudaBackReady = true;
  history.replaceState({ tomudaRoot: 1 }, "");
  armAppBackGuard();
  window.addEventListener("popstate", onAppPopState);
  bindCapacitorBackButton();
}
function bindCapacitorBackButton() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const App = cap.Plugins?.App;
  if (!App?.addListener) return;
  App.addListener("backButton", () => {
    appBack();
  });
}
function qtyStepperApply(btn) {
  const action = btn.getAttribute("data-qty-action");
  const id = btn.getAttribute("data-product-id");
  if (!action || !id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const inPicker = !!btn.closest("[data-picker-root]");
  const min = Number(btn.closest(".qty-stepper")?.dataset?.qtyMin || 0);
  let q = getWorkerQty(id);
  if (action === "inc") {
    if (q >= p.stock) {
      if (inPicker) showStockLimitToast();
      return;
    }
    q = Math.min(p.stock, q + 1);
  } else if (action === "dec") q = Math.max(min, q - 1);
  else return;
  if (inPicker) pickerQtyChange(id, q);
  else setWorkerQty(id, q);
}
function productPackSize(p) {
  const n = Number(p?.boxQuantity);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 0;
}
function pickerQtyFromParts(packs, pieces, p) {
  const packSize = productPackSize(p);
  const pk = Math.max(0, Math.floor(Number(packs) || 0));
  const pc = Math.max(0, Math.floor(Number(pieces) || 0));
  const total = packSize ? pk * packSize + pc : pc;
  return Math.min(p.stock, total);
}
function pickerQtyToParts(q, p) {
  const packSize = productPackSize(p);
  const total = Math.max(0, Math.floor(Number(q) || 0));
  if (!packSize) return { packs: 0, pieces: total };
  return { packs: Math.floor(total / packSize), pieces: total % packSize };
}
function pickerPackMax(p, pieces) {
  const packSize = productPackSize(p);
  if (!packSize) return 0;
  const pc = Math.max(0, Math.floor(Number(pieces) || 0));
  return Math.floor(Math.max(0, p.stock - pc) / packSize);
}
function pickerPieceMax(p, packs) {
  const packSize = productPackSize(p);
  const pk = Math.max(0, Math.floor(Number(packs) || 0));
  if (!packSize) return p.stock;
  return Math.max(0, p.stock - pk * packSize);
}
function readPickerQtyParts(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return { packs: 0, pieces: 0 };
  const packSize = productPackSize(p);
  const fallback = pickerQtyToParts(getWorkerQty(id), p);
  if (!packSize) {
    const input = document.querySelector(
      `[data-picker-qty-input][data-product-id="${id}"]`,
    );
    return {
      packs: 0,
      pieces: input
        ? Number(String(input.value).replace(/\D/g, "")) || 0
        : fallback.pieces,
    };
  }
  const packInput = document.querySelector(
    `[data-picker-pack-input][data-product-id="${id}"]`,
  );
  const pieceInput = document.querySelector(
    `[data-picker-piece-input][data-product-id="${id}"]`,
  );
  return {
    packs: packInput
      ? Number(String(packInput.value).replace(/\D/g, "")) || 0
      : fallback.packs,
    pieces: pieceInput
      ? Number(String(pieceInput.value).replace(/\D/g, "")) || 0
      : fallback.pieces,
  };
}
function pickerPartStepperHtml(
  p,
  value,
  { kind, min = 0, max, sheet = false },
) {
  const idAttr = esc(p.id);
  const v = Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  const decDisabled = v <= min;
  const incDisabled = v >= max;
  const actionAttr =
    kind === "pack" ? "data-picker-pack-action" : "data-picker-piece-action";
  const inputAttr =
    kind === "pack" ? "data-picker-pack-input" : "data-picker-piece-input";
  const draftFn = kind === "pack" ? "pickerPackDraft" : "pickerPieceDraft";
  const commitFn = kind === "pack" ? "pickerPackCommit" : "pickerPieceCommit";
  const label = kind === "pack" ? "Багц" : "Тоо ширхэг";
  const stepperCls = sheet
    ? "picker-qty-stepper--sheet"
    : "picker-qty-stepper--compact";
  return `<div class="qty-stepper picker-qty-stepper ${stepperCls}" data-qty-min="${min}"><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" ${actionAttr}="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="${label} багасгах">−</button><input ${inputAttr} data-product-id="${idAttr}" oninput="${draftFn}(this)" onblur="${commitFn}(this)" value="${v}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="${label}"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" ${actionAttr}="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="${label} нэмэх">+</button></div>`;
}
function pickerPartStepperApply(btn, kind) {
  const action = btn.getAttribute(
    kind === "pack" ? "data-picker-pack-action" : "data-picker-piece-action",
  );
  const id = btn.getAttribute("data-product-id");
  if (!action || !id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  let { packs, pieces } = readPickerQtyParts(id);
  const currentTotal = pickerQtyFromParts(packs, pieces, p);
  if (kind === "pack") {
    if (action === "inc") {
      const max = pickerPackMax(p, pieces);
      if (packs >= max) {
        showStockLimitToast();
        return;
      }
      packs = Math.min(max, packs + 1);
    } else if (action === "dec") packs = Math.max(0, packs - 1);
    else return;
  } else if (action === "inc") {
    const max = pickerPieceMax(p, packs);
    if (pieces >= max) {
      showStockLimitToast();
      return;
    }
    pieces = Math.min(max, pieces + 1);
  } else if (action === "dec") pieces = Math.max(0, pieces - 1);
  else return;
  const nextTotal = pickerQtyFromParts(packs, pieces, p);
  if (nextTotal <= currentTotal && action === "inc") {
    showStockLimitToast();
    return;
  }
  pickerQtyChange(id, nextTotal);
}
function pickerPartDraft(el, kind) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  let { packs, pieces } = readPickerQtyParts(id);
  const n = digits ? Number(digits) : 0;
  if (kind === "pack") {
    const max = pickerPackMax(p, pieces);
    if (n > max) showStockLimitToast();
    packs = Math.min(max, n);
  } else {
    const max = pickerPieceMax(p, packs);
    if (n > max) showStockLimitToast();
    pieces = Math.min(max, n);
  }
  const total = pickerQtyFromParts(packs, pieces, p);
  if (total > 0) state.workerQty[id] = total;
  else delete state.workerQty[id];
  el.value = String(kind === "pack" ? packs : pieces);
  syncPickerQtySheetUi(id);
}
function pickerPartCommit(el, kind) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  let { packs, pieces } = readPickerQtyParts(id);
  const digits = String(el.value || "").replace(/\D/g, "");
  const n = digits ? Number(digits) : 0;
  if (kind === "pack") {
    const max = pickerPackMax(p, pieces);
    if (n > max) showStockLimitToast();
    packs = Math.min(max, n);
  } else {
    const max = pickerPieceMax(p, packs);
    if (n > max) showStockLimitToast();
    pieces = Math.min(max, n);
  }
  pickerQtyChange(id, pickerQtyFromParts(packs, pieces, p));
}
function pickerPackDraft(el) {
  pickerPartDraft(el, "pack");
}
function pickerPieceDraft(el) {
  pickerPartDraft(el, "piece");
}
function pickerPackCommit(el) {
  pickerPartCommit(el, "pack");
}
function pickerPieceCommit(el) {
  pickerPartCommit(el, "piece");
}
function syncPickerQtySheetUi(id) {
  const totalEl = document.querySelector("[data-picker-qty-total]");
  if (totalEl) totalEl.textContent = `${getWorkerQty(id)} ш`;
  if (pickerOpen()) {
    refreshPickerList();
    updatePickerClearBtn();
  }
}
function pickerQtyStepperHtml(p, q, { min = 0, sheet = false } = {}) {
  const idAttr = esc(p.id);
  const nameLabel = esc(p.name);
  const groupId = `picker-qty-label-${idAttr}`;
  const decDisabled = q <= min;
  const incDisabled = q >= p.stock;
  const stepperCls = sheet
    ? "picker-qty-stepper--sheet"
    : "picker-qty-stepper--compact";
  return `<div class="qty-stepper picker-qty-stepper ${stepperCls}" data-qty-min="${min}" role="group" aria-labelledby="${groupId}"><span id="${groupId}" class="sr-only">${nameLabel} — тоо ширхэг сонгох</span><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" data-qty-action="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="${nameLabel} багасгах">−</button><input data-picker-qty-input data-product-id="${idAttr}" oninput="qtyDraft(this)" onblur="qtyCommit(this)" value="${q}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="${nameLabel} тоо ширхэг" aria-valuenow="${q}" aria-valuemin="${min}" aria-valuemax="${p.stock}"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" data-qty-action="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="${nameLabel} нэмэх">+</button></div>`;
}
function ensurePickerActiveId() {
  if (
    state.pickerActiveId &&
    !state.products.some((p) => p.id === state.pickerActiveId)
  ) {
    state.pickerActiveId = "";
  }
}
function finishPickerEditFor(id) {
  if (!id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  if (productPackSize(p)) {
    const { packs, pieces } = readPickerQtyParts(id);
    setWorkerQty(id, pickerQtyFromParts(packs, pieces, p));
  } else {
    const input = document.querySelector(
      `[data-picker-qty-input][data-product-id="${id}"]`,
    );
    if (input) qtyCommit(input);
  }
  if (state.pickerActiveId === id) state.pickerActiveId = "";
}
function workerQtyStepperHtml(p, q) {
  const idAttr = esc(p.id);
  const decDisabled = q <= 1;
  const incDisabled = q >= p.stock;
  return `<div class="qty-stepper worker-order-qty-stepper" data-qty-min="1"><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" data-qty-action="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="Багасгах">−</button><input data-product-id="${idAttr}" oninput="qtyDraft(this)" onblur="qtyCommit(this)" value="${q}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="Тоо ширхэг"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" data-qty-action="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="Нэмэх">+</button></div>`;
}
function setWorkerOrderActive(id) {
  if (!id) return;
  state.workerOrderActiveId = id;
  render();
}
function finishWorkerOrderEdit() {
  const id = state.workerOrderActiveId;
  if (id) {
    const input = document.querySelector(
      `.worker-order-qty-stepper input[data-product-id="${id}"]`,
    );
    if (input) qtyCommit(input);
    else if (!getWorkerQty(id)) {
      const p = state.products.find((x) => x.id === id);
      if (p) state.workerQty[id] = 1;
    }
  }
  state.workerOrderActiveId = "";
  render();
}
function finishPickerEdit() {
  if (state.pickerActiveId) finishPickerEditFor(state.pickerActiveId);
  if (pickerOpen() && refreshPickerList()) return;
  render();
  if (pickerOpen()) pickerModal();
}
function workerOrderQtyHtml(p, q) {
  const id = esc(p.id);
  if (state.workerOrderActiveId === p.id)
    return `<div class="worker-row-edit">${workerQtyStepperHtml(p, q)}<button type="button" class="worker-row-done-link" onclick="finishWorkerOrderEdit()">Болсон</button></div>`;
  return `<button type="button" class="worker-row-qty" onclick="setWorkerOrderActive('${id}')"><span class="worker-row-qty__n">${q}</span><span class="worker-row-qty__unit">ш</span></button>`;
}
function qtyDraft(el) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const min = Number(el.closest(".qty-stepper")?.dataset?.qtyMin ?? 0);
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  if (!digits) return;
  const n = Number(digits);
  if (n > p.stock && el.hasAttribute("data-picker-qty-input"))
    showStockLimitToast();
  const capped = Math.min(n, p.stock);
  if (capped < min) return;
  state.workerQty[id] = capped;
  if (String(capped) !== digits) el.value = String(capped);
  el.setAttribute("aria-valuenow", String(capped));
  if (pickerOpen()) {
    if (el.hasAttribute("data-picker-qty-input")) syncPickerQtySheetUi(id);
    else updatePickerClearBtn();
  }
}
function qtyCommit(el) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const min = Number(el.closest(".qty-stepper")?.dataset?.qtyMin ?? 0);
  const digits = String(el.value || "").replace(/\D/g, "");
  let v = digits ? Number(digits) : 0;
  if (v > p.stock && el.hasAttribute("data-picker-qty-input"))
    showStockLimitToast();
  if (v < min) v = min;
  v = Math.min(v, p.stock);
  el.value = String(v);
  el.setAttribute("aria-valuenow", String(v));
  setWorkerQty(id, v);
}
function initQtyStepperButtons() {
  if (document.documentElement.dataset.qtyStepperBound) return;
  document.documentElement.dataset.qtyStepperBound = "1";
  document.addEventListener(
    "pointerdown",
    (e) => {
      const btn = e.target.closest?.(".qty-stepper__btn[data-qty-action]");
      if (!btn) return;
      if (btn.disabled) {
        if (
          btn.getAttribute("data-qty-action") === "inc" &&
          btn.closest("[data-picker-root]")
        ) {
          showStockLimitToast();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      qtyStepperApply(btn);
    },
    true,
  );
}
function initEmployeeModalActions() {
  if (modal.dataset.employeeFormBound) return;
  modal.dataset.employeeFormBound = "1";
  modal.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-employee-form]");
    if (!form) return;
    saveEmployee(e);
  });
}
function initPickerModalActions() {
  if (modal.dataset.pickerBound) return;
  modal.dataset.pickerBound = "1";
  modal.addEventListener(
    "pointerdown",
    (e) => {
      const packBtn = e.target.closest("[data-picker-pack-action]");
      if (packBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (
          packBtn.disabled &&
          packBtn.getAttribute("data-picker-pack-action") === "inc"
        ) {
          showStockLimitToast();
        } else if (!packBtn.disabled) {
          pickerPartStepperApply(packBtn, "pack");
        }
        return;
      }
      const pieceBtn = e.target.closest("[data-picker-piece-action]");
      if (pieceBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (
          pieceBtn.disabled &&
          pieceBtn.getAttribute("data-picker-piece-action") === "inc"
        ) {
          showStockLimitToast();
        } else if (!pieceBtn.disabled) {
          pickerPartStepperApply(pieceBtn, "piece");
        }
      }
    },
    true,
  );
  modal.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-picker-cat]");
    if (catBtn) {
      setPickerCategory(catBtn.getAttribute("data-picker-cat") || "");
      return;
    }
    const clearCartBtn = e.target.closest("[data-picker-clear-cart]");
    if (clearCartBtn) {
      clearPickerCart();
      return;
    }
    const openBtn = e.target.closest("[data-picker-open]");
    if (openBtn) {
      const id = openBtn.getAttribute("data-picker-open") || "";
      if (id) openPickerQtySheet(id);
      return;
    }
    const qtyClose = e.target.closest("[data-picker-qty-close]");
    if (qtyClose) {
      closePickerQtySheet();
      return;
    }
    const qtyDone = e.target.closest("[data-picker-qty-done]");
    if (qtyDone) {
      const id =
        qtyDone.getAttribute("data-product-id") || state.pickerQtyProductId;
      if (id) finishPickerEditFor(id);
      state.pickerQtyProductId = "";
      if (pickerOpen()) pickerModal();
      return;
    }
  });
}
function initNoZoom() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
    );
  }
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault(), {
      passive: false,
    });
  });
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}
const NESTED_SCROLL_CHAIN_SELECTOR =
  ".line-list--scroll, .worker-order-lines-wrap, .picker-step2__scroll, .stock-alert-list, .employee-form__body, .modal-scroll";

function initScrollRenderGuard() {
  if (initScrollRenderGuard._bound) return;
  initScrollRenderGuard._bound = true;
  document.addEventListener(
    "scroll",
    (e) => {
      const t = e.target;
      if (
        t?.matches?.(
          ".app-main, .line-list--scroll, .line-list, .product-list, .wh-receipt-list",
        )
      ) {
        markUserScrollActive();
      }
    },
    { passive: true, capture: true },
  );
  document.addEventListener(
    "touchstart",
    (e) => {
      if (
        e.target?.closest?.(
          ".line-list--scroll, .line-list, .product-list, .app-main, .wh-receipt-list",
        )
      ) {
        markUserScrollActive();
      }
    },
    { passive: true, capture: true },
  );
}

function findScrollableParent(node) {
  while (node && node !== document.documentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement;
}

function nestedScrollChainTarget(el) {
  return (
    el.closest(".app-main") ||
    findScrollableParent(el.parentElement) ||
    document.scrollingElement
  );
}

function initNestedScrollChain() {
  if (initNestedScrollChain._bound) return;
  initNestedScrollChain._bound = true;
  let chainEl = null;
  let startY = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      chainEl = e.target.closest(NESTED_SCROLL_CHAIN_SELECTOR);
      startY = e.touches[0]?.pageY ?? 0;
    },
    { passive: true },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      const el = chainEl;
      if (!el || !el.contains(e.target)) return;
      if (el.scrollHeight <= el.clientHeight + 1) {
        chainEl = null;
        return;
      }
      const y = e.touches[0]?.pageY ?? 0;
      const dy = startY - y;
      const atTop = el.scrollTop <= 0;
      const atBottom =
        Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
      if (!((atTop && dy < 0) || (atBottom && dy > 0))) return;
      const parent = nestedScrollChainTarget(el);
      if (parent && parent !== el) {
        parent.scrollTop += dy;
        startY = y;
      }
    },
    { passive: true },
  );
  document.addEventListener(
    "touchend",
    () => {
      chainEl = null;
    },
    { passive: true },
  );
  document.addEventListener(
    "touchcancel",
    () => {
      chainEl = null;
    },
    { passive: true },
  );
}
let pwaInstallPrompt = null;
let pwaBannerScheduled = false;
function maybeShowPwaInstallBanner() {
  if (pwaBannerScheduled || isNativeApp() || !state.isLoggedIn) return;
  const dismissed = Number(localStorage.getItem("pwa-install-dismissed") || 0);
  if (Date.now() - dismissed < 7 * 86400000) return;
  pwaBannerScheduled = true;
  setTimeout(showUnifiedInstallBanner, 3000);
}
function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|WeChat/i.test(
    ua,
  );
}
function inAppBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  return "энэ app";
}
function copyAppLink() {
  const url = location.href.split("#")[0];
  const done = () =>
    alert(
      "Link хуулагдлаа!\n\nChrome (Android) эсвэл Safari (iPhone) нээж, хаягийн мөрөнд paste хийгээд нээнэ үү.",
    );
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(done)
      .catch(() => prompt("Link-ийг хуулна уу:", url));
  } else {
    prompt("Link-ийг хуулна уу:", url);
  }
}
function pwaInAppEscapeSteps() {
  const app = inAppBrowserName();
  const android = isAndroidDevice();
  const ios = isIosDevice();
  if (android) {
    return `<div class="tone tone--success tone--block text-sm mb-4"><b>Android:</b> APK биш Chrome-ийн <b>Install app</b> ашиглаж суулгана.</div><ol class="space-y-3 text-sm leading-relaxed mb-4"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span><b>Chrome дээр нээх</b> товч дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span>Chrome дээр баруун дээд <b>⋮</b> menu дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span><b>Install app</b> эсвэл <b>Add to Home screen</b> сонгоно</span></li></ol><button type="button" onclick="openInChrome()" class="w-full py-3 bg-primary text-primary-foreground rounded font-semibold">Chrome дээр нээх</button>`;
  }
  if (ios) {
    return `<div class="tone tone--danger tone--block text-sm mb-4"><b>${app} дотор суулгах боломжгүй!</b><br>Эхлээд Safari browser руу шилжинэ үү.</div><ol class="space-y-3 text-sm leading-relaxed mb-4"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Дээд баруун <b>⋯</b> (цэгүүд) дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span><b>Safari-аар нээх</b> / <b>Open in Safari</b> сонгоно</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Safari дээр доод <b>Хуваалцах □↑</b> → <b>Нүүр дэлгэцэнд нэмэх</b></span></li></ol><button type="button" onclick="copyAppLink()" class="w-full py-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
  }
  return `<p class="text-sm">Link-ийг Chrome эсвэл Safari-аар нээнэ үү.</p><button type="button" onclick="copyAppLink()" class="w-full py-3 mt-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
}
function isAppleDesktopOrIos() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return (
    isIosDevice() ||
    /Mac|Macintosh|iPhone|iPad|iPod/i.test(platform) ||
    (/Mac OS X/i.test(ua) && !/Chrome|CriOS|Edg|Firefox|FxiOS/i.test(ua))
  );
}
function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}
function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || "");
}
function isSafariBrowser() {
  const ua = navigator.userAgent || "";
  return (
    isIosDevice() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  );
}
function isChromeAndroid() {
  const ua = navigator.userAgent || "";
  return (
    isAndroidDevice() &&
    /Chrome/i.test(ua) &&
    !/EdgA|OPR|SamsungBrowser|MiuiBrowser|UCBrowser/i.test(ua)
  );
}
function pwaInstallLabel() {
  return "📱 App суулгах";
}
function isNativeApp() {
  return isStandalonePwa() || !!window.Capacitor;
}
function showInstallToast(msg) {
  showAppToast(msg, "success");
}
function showStockLimitToast() {
  showAppToast("Үлдэгдэл хүрэхгүй байна", "error");
}
async function triggerNativeInstallPrompt() {
  if (!pwaInstallPrompt) return false;
  try {
    await pwaInstallPrompt.prompt();
    await pwaInstallPrompt.userChoice;
    pwaInstallPrompt = null;
    dismissPwaInstall(false);
    dismissInstallCoach();
    return true;
  } catch (err) {
    console.warn("Install prompt failed", err);
    pwaInstallPrompt = null;
    return false;
  }
}
function dismissInstallCoach() {
  document.getElementById("install-coach")?.remove();
}
function showIosInstallCoach() {
  dismissInstallCoach();
  const el = document.createElement("div");
  el.id = "install-coach";
  el.className = "ios-install-coach";
  el.innerHTML = `<div class="ios-install-coach-backdrop" onclick="dismissInstallCoach()"></div><div class="ios-install-coach-panel"><p class="ios-install-coach-title">📱 iPhone дээр суулгах</p><p class="ios-install-coach-step">1. Доод <b>Share □↑</b> дарна</p><p class="ios-install-coach-step">2. <b>Add to Home Screen</b> (Нүүр дэлгэцэнд нэмэх)</p><p class="ios-install-coach-step">3. <b>Add</b> (Нэмэх) дарна</p><div class="ios-install-coach-arrow" aria-hidden="true">↓</div><button type="button" class="ios-install-coach-btn" onclick="dismissInstallCoach()">Ойлголоо</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("ios-install-coach--visible"));
}
function showAndroidInstallCoach() {
  dismissInstallCoach();
  const el = document.createElement("div");
  el.id = "install-coach";
  el.className = "ios-install-coach";
  el.innerHTML = `<div class="ios-install-coach-backdrop" onclick="dismissInstallCoach()"></div><div class="ios-install-coach-panel"><p class="ios-install-coach-title">📱 Android дээр суулгах</p><p class="ios-install-coach-step">1. Энэ хуудсыг <b>Chrome</b> browser дээр нээнэ</p><p class="ios-install-coach-step">2. Баруун дээд <b>⋮</b> menu дарна</p><p class="ios-install-coach-step">3. <b>Install app</b> эсвэл <b>Add to Home screen</b> сонгоно</p><p class="ios-install-coach-step">4. Нүүр дэлгэцээс <b>TOMUDA</b> app-аар нээнэ</p><button type="button" class="ios-install-coach-btn" onclick="openInChrome()">Chrome дээр нээх</button><button type="button" class="ios-install-coach-btn mt-2" style="margin-top:8px;background:transparent;color:var(--hex-muted-foreground)" onclick="dismissInstallCoach()">Хаах</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("ios-install-coach--visible"));
}
function installUrlWithFlag() {
  const url = new URL(location.href);
  url.searchParams.set("install", "1");
  return url.toString();
}
function openInSafari() {
  const target = installUrlWithFlag();
  if (/CriOS/i.test(navigator.userAgent || "")) {
    location.href = target.replace(/^https:\/\//, "x-safari-https://");
    return;
  }
  location.href = target;
}
function installAppOnPhone() {
  if (isNativeApp()) return;
  dismissPwaInstall(false);

  if (isIosDevice()) {
    if (!isSafariBrowser() || isInAppBrowser()) {
      sessionStorage.setItem("tomuda-pending-install", "1");
      openInSafari();
      showInstallToast("Safari нээгдэж байна...");
      return;
    }
    triggerNativeInstallPrompt().then((installed) => {
      if (!installed) showIosInstallCoach();
    });
    return;
  }

  triggerNativeInstallPrompt().then((installed) => {
    if (installed) return;
    if (isAndroidDevice()) {
      if (isInAppBrowser()) {
        openInChrome();
        showInstallToast("Chrome нээгдэж байна...");
        return;
      }
      showAndroidInstallCoach();
      return;
    }
    showAndroidInstallCoach();
  });
}
function checkPendingApkInstallCoach() {
  sessionStorage.removeItem("tomuda-apk-downloaded");
}
function tryAutoInstallFromRedirect() {
  const url = new URL(location.href);
  const pending =
    url.searchParams.get("install") === "1" ||
    sessionStorage.getItem("tomuda-pending-install") === "1";
  if (!pending) return;
  url.searchParams.delete("install");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  sessionStorage.removeItem("tomuda-pending-install");

  if (!isIosDevice()) {
    if (isAndroidDevice()) installAppOnPhone();
    return;
  }

  if (!isSafariBrowser()) return;

  let tries = 0;
  const attempt = async () => {
    if (await triggerNativeInstallPrompt()) return;
    if (++tries < 15) {
      setTimeout(attempt, 400);
      return;
    }
    showIosInstallCoach();
  };
  setTimeout(attempt, 600);
}
function androidApkInstallSteps() {
  return `<ol class="space-y-3 text-sm leading-relaxed"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Chrome дээр баруун дээд <b>⋮</b> menu дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span><b>Install app</b> эсвэл <b>Add to Home screen</b> сонгоно</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Нүүр дэлгэцээс <b>TOMUDA</b> app-аар нээнэ</span></li></ol>`;
}
function openInChrome() {
  const page = installUrlWithFlag();
  const path = page.replace(/^https?:\/\//, "");
  location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(page)};end`;
}
function initPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("Service worker registration failed", err));
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwaInstallPrompt = e;
    maybeShowPwaInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    dismissPwaInstall(false);
    dismissInstallCoach();
    showInstallToast("App амжилттай суулгагдлаа!");
  });
  checkPendingApkInstallCoach();
  tryAutoInstallFromRedirect();
}
function pwaInstallSidebarBtn() {
  if (isNativeApp()) return "";
  return `<button type="button" onclick="installAppOnPhone()" class="sidebar-pwa-btn"><span>${pwaInstallLabel()}</span></button>`;
}
function showUnifiedInstallBanner() {
  if (isNativeApp() || document.getElementById("pwa-install")) return;
  const el = document.createElement("div");
  el.id = "pwa-install";
  el.className = "pwa-install-banner";
  el.innerHTML = `<div class="pwa-install-inner"><div><p class="pwa-install-title">${pwaInstallLabel()}</p><p class="pwa-install-text">Дармагц суулгагдана — нүүр дэлгэц дээр <strong>байнгын app</strong></p></div><div class="pwa-install-actions"><button type="button" onclick="installAppOnPhone()" class="pwa-install-btn">Суулгах</button><button type="button" onclick="dismissPwaInstall()" class="pwa-install-dismiss">Хаах</button></div></div>`;
  document.body.appendChild(el);
}
function openPwaInstallModal() {
  installAppOnPhone();
}
function showPwaInstallBanner() {
  showUnifiedInstallBanner();
}
function installPwaApp() {
  installAppOnPhone();
}
function dismissPwaInstall(remember = true) {
  document.getElementById("pwa-install")?.remove();
  if (remember)
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
}
function scheduleBackendSave() {
  persistOrderSnapshot();
  if (!backendReady) return;
  if (!state.isLoggedIn || !state.currentEmployee?.id) return;
  if (!canAutoSaveBackendState()) return;
  clearTimeout(backendSaveTimer);
  backendSaveTimer = setTimeout(saveBackendState, 350);
}
function canAutoSaveBackendState() {
  if (
    hasPermission("orders.edit") ||
    hasPermission("orders.create") ||
    hasPermission("products.edit") ||
    hasPermission("products.create") ||
    hasPermission("customers.edit") ||
    hasPermission("customers.create") ||
    hasPermission("warehouse.edit") ||
    hasPermission("employees.edit") ||
    hasPermission("employees.create") ||
    hasPermission("settings.view")
  ) {
    return true;
  }
  return !localStateDirty();
}
async function revertBackendStateFromServer() {
  try {
    const latest = await fetchBackendPayload();
    if (!latest?.state) return false;
    const session = captureSessionSnapshot();
    const merged = mergePersistentStates(latest.state, persistentState());
    applyPersistentState(merged);
    restoreSessionSnapshot(session);
    syncBackendSaveMarker();
    if (latest.updatedAt) serverUpdatedAt = latest.updatedAt;
    return true;
  } catch (error) {
    console.warn("Backend state revert failed", error);
    return false;
  }
}
async function flushBackendSave() {
  if (!backendReady) return false;
  clearTimeout(backendSaveTimer);
  backendSaveTimer = null;
  persistOrderSnapshot();
  await saveBackendState();
  if (!localStateDirty()) return true;
  await sleep(600);
  await saveBackendState();
  return !localStateDirty();
}
function markBackendSaveFailed(message = "") {
  backendSaveFailedMessage = String(
    message || "Серверт хадгалагдаагүй өгөгдөл байна",
  ).trim();
}
function clearBackendSaveFailed() {
  backendSaveFailedMessage = "";
}
function hasUnsavedLocalData() {
  if (localStateDirty()) return true;
  if (readLocalPendingState()) clearOrderPersistenceCache();
  return false;
}
function criticalBackendSave() {
  persistOrderSnapshot();
  if (!backendReady) return Promise.resolve(false);
  return flushBackendSave().catch((error) => {
    console.warn("Backend save failed", error);
    markBackendSaveFailed("Серверт хадгалахад алдаа гарлаа");
    return false;
  });
}
async function retryPendingBackendSave() {
  const ok = await flushBackendSave();
  if (ok) clearBackendSaveFailed();
  render();
}
function dataSaveBannerHtml() {
  return "";
}
function warehouseDateFilterActive() {
  return (
    (normalizeIsoDateInput(state.filters.warehouseDate) || todayIso()) ===
    todayIso()
  );
}
function warehouseLiveFilterBannerHtml() {
  if (!warehouseDateFilterActive()) return "";
  const total = (state.orders || []).length;
  const visible = filterWarehouseOrders(state.orders || []).length;
  const hidden = Math.max(0, total - visible);
  return `<div class="wh-date-banner" role="status"><strong>Зөвхөн өнөөдрийн захиалга харагдаж байна.</strong><span>Нийт ${total}, энд ${visible}${hidden ? ` · ${hidden} нуугдсан` : ""}. Бүх захиалгыг Админ → Захиалга хэсгээс үзнэ үү.</span></div>`;
}
async function saveBackendState(retry = 0) {
  backendSaveTimer = null;
  if (!state.isLoggedIn || !state.currentEmployee?.id) return;
  if (importLoading) {
    scheduleBackendSave();
    return;
  }
  const protectedData = protectAccidentalDeletions(persistentState());
  if (protectedData.orders) {
    protectedData.orders = retainedOrders(protectedData.orders);
  }
  if (JSON.stringify(protectedData) !== JSON.stringify(persistentState())) {
    const session = captureSessionSnapshot();
    applyPersistentState(protectedData);
    restoreSessionSnapshot(session);
    if (!shouldDeferBackendSync()) safeRender();
  }
  if (!shouldDeferBackendSync()) {
    try {
      const latest = await fetchBackendPayload();
      if (latest?.state) {
        const merged = mergePersistentStates(latest.state, persistentState());
        if (JSON.stringify(merged) !== JSON.stringify(persistentState())) {
          const session = captureSessionSnapshot();
          applyPersistentState(merged);
          restoreSessionSnapshot(session);
          safeRender();
        }
      }
    } catch (error) {
      console.warn("Backend pre-save merge failed", error);
    }
  }
  const payloadState = stateForBackendSave();
  const snapshot = backendStateSnapshot(payloadState);
  const body = JSON.stringify({
    state: payloadState,
    actor: state.currentEmployee
      ? {
          id: state.currentEmployee.id,
          email: state.currentEmployee.email,
        }
      : null,
  });
  if (snapshot === backendLastSaved) {
    clearOrderPersistenceCache();
    return;
  }
  if (importLoading) {
    scheduleBackendSave();
    return;
  }
  backendSaving = true;
  try {
    const res = await fetch(`${API_BASE}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    if (res.ok) {
      const payload = await res.json();
      let appliedServerState = false;
      if (payload?.state) {
        const beforeSnapshot = backendStateSnapshot();
        const session = captureSessionSnapshot();
        const merged = mergePersistentStates(payload.state, persistentState());
        applyPersistentState(merged);
        restoreSessionSnapshot(session);
        appliedServerState = backendStateSnapshot() !== beforeSnapshot;
      }
      syncBackendSaveMarker();
      clearOrderPersistenceCache();
      clearBackendSaveFailed();
      if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
      if (appliedServerState && !shouldDeferBackendSync()) safeRender();
    } else if (res.status === 403) {
      let msg = "Эрх хүрэлцэхгүй";
      try {
        const err = await res.json();
        if (err?.detail) msg = String(err.detail);
      } catch {
        /* ignore */
      }
      persistOrderSnapshot();
      markBackendSaveFailed(msg);
      await revertBackendStateFromServer();
      if (!shouldDeferBackendSync()) safeRender();
    } else {
      persistOrderSnapshot();
      markBackendSaveFailed("Серверт хадгалахад алдаа гарлаа");
      if (retry >= 2) {
        alertModal(
          "Хадгалах амжилтгүй",
          "Захиалга түр хадгалагдлаа. Интернет холболтоо шалгаад дахин оролдоно уу.",
        );
      } else {
        backendSaving = false;
        await sleep(900 * (retry + 1));
        return saveBackendState(retry + 1);
      }
    }
  } catch (error) {
    console.warn("Backend state save failed", error);
    persistOrderSnapshot();
    markBackendSaveFailed("Интернет холболт эсвэл серверийн алдаа");
    if (retry >= 2) {
      alertModal(
        "Хадгалах амжилтгүй",
        "Захиалга түр хадгалагдлаа. Интернет холболтоо шалгаад хуудсыг дахин ачаална уу.",
      );
    } else {
      backendSaving = false;
      await sleep(900 * (retry + 1));
      return saveBackendState(retry + 1);
    }
  } finally {
    backendSaving = false;
  }
}
function initPageUnloadPersist() {
  if (document.documentElement.dataset.pageUnloadPersistBound) return;
  document.documentElement.dataset.pageUnloadPersistBound = "1";
  const persist = () => persistOrderSnapshot();
  window.addEventListener("pagehide", persist);
  window.addEventListener("beforeunload", persist);
}

function go(view, opts = {}) {
  if (!canAccessView(view)) {
    if (!opts.silent) {
      alertModal(
        "Эрхгүй",
        "Энэ хэсгийг харах эрх байхгүй байна. Админаас эрхээ шалгуулна уу.",
      );
    }
    return;
  }
  const changed = state.currentView !== view;
  const wasWorkerOrders =
    state.currentView === "worker" && state.filters.worker === "orders";
  if (
    view === "worker" &&
    state.currentView === "worker" &&
    state.filters.worker === "orders"
  ) {
    clearWorkerOrderHighlight();
    state.filters.worker = "new";
    state.mobileOpen = false;
    saveAuthSession();
    render();
    if (!opts.silent && !suppressHistoryPush) pushAppHistory();
    return;
  }
  if (changed && wasWorkerOrders) clearWorkerOrderHighlight();
  state.currentView = view;
  state.mobileOpen = false;
  if (changed && view !== "promotions") state.filters.promotionDetail = "";
  if (changed && view === "promotions") state.filters.promotionDetail = "";
  if (changed && (view === "warehouse" || view === "warehouseReceipts")) {
    state.filters.warehouseDate = todayIso();
    state.selectedWarehouseOrderId = "";
  }
  saveAuthSession();
  render();
  if (changed && !opts.silent && !suppressHistoryPush) pushAppHistory();
}
function search(key, value) {
  state.searches[key] = value;
  clearTimeout(searchRenderTimer);
  searchRenderTimer = setTimeout(() => {
    render();
    const el = document.querySelector(`[data-focus="${key}"]`);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, 220);
}
function scrollAppMainToTop() {
  requestAnimationFrame(() => {
    document.querySelector(".app-main")?.scrollTo({ top: 0, left: 0 });
  });
}
const SCROLL_TOP_FAB_VIEWS = new Set([
  "products",
  "customers",
  "orders",
  "warehouseReceipts",
]);
function usesScrollTopFab() {
  if (SCROLL_TOP_FAB_VIEWS.has(state.currentView)) return true;
  return state.currentView === "worker" && state.filters.worker === "orders";
}
function scrollTopFabHtml() {
  if (!usesScrollTopFab()) return "";
  return `<button type="button" class="scroll-top-fab" data-scroll-top-fab hidden onclick="scrollPageToTop()" aria-label="Дээш очих"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg></button>`;
}
function scrollTopScrollTargets() {
  return [
    document.querySelector(".app-main"),
    document.querySelector(".line-list--scroll"),
    document.querySelector(".wh-receipt-list"),
    document.querySelector(".list-panel__body"),
    document.querySelector(".product-list"),
  ].filter(Boolean);
}
function scrollPageToTop() {
  scrollTopScrollTargets().forEach((el) => {
    try {
      el.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      el.scrollTop = 0;
    }
  });
}
function bindScrollTopFab() {
  const fab = document.querySelector("[data-scroll-top-fab]");
  if (!fab) return;
  const targets = scrollTopScrollTargets();
  const update = () => {
    const scrolled = targets.some((el) => (el.scrollTop || 0) > 140);
    fab.hidden = !scrolled;
    fab.classList.toggle("is-visible", scrolled);
  };
  targets.forEach((el) => {
    if (el._scrollTopFabHandler) {
      el.removeEventListener("scroll", el._scrollTopFabHandler);
    }
    el._scrollTopFabHandler = update;
    el.addEventListener("scroll", update, { passive: true });
  });
  update();
}
let lastRenderedView = null;
function captureRenderScroll() {
  const main = document.querySelector(".app-main");
  const lineList = document.querySelector(".line-list--scroll");
  const snap = {
    sameView: lastRenderedView === state.currentView,
    mainTop: main?.scrollTop ?? 0,
    lineListTop: lineList?.scrollTop ?? null,
    pickerLists: {},
    receiptListTop: null,
  };
  document.querySelectorAll(".wh-receipt-picker.is-open").forEach((picker) => {
    const key = picker.hasAttribute("data-permission-employee-picker")
      ? "permission"
      : picker.hasAttribute("data-receipt-worker-picker")
        ? "worker"
        : picker.hasAttribute("data-receipt-delivery-picker")
          ? "delivery"
          : "";
    if (!key) return;
    const list = picker.querySelector(".wh-receipt-picker__list");
    if (list) snap.pickerLists[key] = list.scrollTop;
  });
  const receiptList = document.querySelector(".wh-receipt-list");
  if (receiptList) snap.receiptListTop = receiptList.scrollTop;
  return snap;
}
function restoreRenderScroll(snap) {
  if (!snap?.sameView) return;
  requestAnimationFrame(() => {
    const main = document.querySelector(".app-main");
    if (main) main.scrollTop = snap.mainTop;
    const pickerSel = {
      permission: "[data-permission-employee-picker].is-open",
      worker: "[data-receipt-worker-picker].is-open",
      delivery: "[data-receipt-delivery-picker].is-open",
    };
    for (const [key, sel] of Object.entries(pickerSel)) {
      if (snap.pickerLists[key] == null) continue;
      const list = document.querySelector(`${sel} .wh-receipt-picker__list`);
      if (list) list.scrollTop = snap.pickerLists[key];
    }
    if (snap.receiptListTop != null) {
      const receiptList = document.querySelector(".wh-receipt-list");
      if (receiptList) receiptList.scrollTop = snap.receiptListTop;
    }
    if (snap.lineListTop != null) {
      const lineList = document.querySelector(".line-list--scroll");
      if (lineList) lineList.scrollTop = snap.lineListTop;
    }
  });
}
function shell(content) {
  const userRole = currentRole();
  const sidebarNav = sidebarNavForRole(userRole);
  const bottomNav = bottomNavForRole(userRole);
  const emp = state.currentEmployee,
    useBottomNav = bottomNav.length >= 2,
    pageTitle = currentPageTitle(sidebarNav),
    workerOrdersList =
      state.currentView === "worker" && state.filters.worker === "orders",
    workerOrdersArrived = workerOrdersList && state.workerOrdersArrived;
  const backBtn = canAppBack()
    ? `<button type="button" class="mobile-top-bar__back" onclick="appBack()" aria-label="Буцах"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>`
    : `<span class="mobile-top-bar__back-spacer" aria-hidden="true"></span>`;
  return `<div class="app-shell min-h-screen bg-background flex ${useBottomNav ? "app-shell--bottom-nav" : ""}${workerOrdersList ? " app-shell--worker-orders" : ""}"><button type="button" onclick="state.mobileOpen=!state.mobileOpen;render()" class="mobile-menu-button lg:hidden fixed z-50 bg-sidebar text-sidebar-foreground rounded ${state.mobileOpen ? "mobile-menu-button--open" : ""} ${useBottomNav ? "mobile-menu-button--sheet" : ""}" aria-label="${state.mobileOpen ? "Цэс хаах" : "Цэс нээх"}">${state.mobileOpen ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`}</button>${state.mobileOpen ? `<div onclick="state.mobileOpen=false;render()" class="mobile-menu-overlay lg:hidden fixed inset-0 bg-black/50 z-30"></div>` : ""}<header class="mobile-top-bar lg:hidden${workerOrdersList ? " mobile-top-bar--worker-orders" : ""}${workerOrdersArrived ? " mobile-top-bar--worker-orders-arrived" : ""}">${backBtn}<p class="mobile-top-bar__title">${esc(pageTitle)}</p>${emp ? `<button type="button" class="mobile-top-bar__user" onclick="state.mobileOpen=true;render()" aria-label="Профайл, гарах">${employeeAvatarHtml(emp, "mobile-top-bar__user-avatar")}</button>` : ""}</header><aside class="app-sidebar mobile-sidebar fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ${state.mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col"><div class="sidebar-brand p-6 border-b border-sidebar-border"><div class="sidebar-brand__row flex items-center gap-3 min-w-0"><img src="${BRAND.logoWhite}" alt="ТОМУДА" class="tomuda-logo" width="44" height="44" decoding="async"><div class="min-w-0"><h1 class="text-lg font-bold text-sidebar-primary truncate">ТОМУДА</h1><p class="sidebar-brand__tag hidden lg:block">Борлуулалт · Агуулах</p></div></div></div><nav class="app-sidebar-nav flex-col flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 gap-1" aria-label="Үндсэн цэс"><p class="sidebar-nav-section hidden lg:block">Цэс</p>${sidebarNavItems(sidebarNav)}${pwaInstallSidebarBtn()}</nav><div class="sidebar-foot p-4 border-t border-sidebar-border">${emp ? `<div class="sidebar-user">${employeeAvatarHtml(emp, "sidebar-user__avatar")}<div class="sidebar-user__meta"><p class="sidebar-user__name">${esc(emp.name)}</p><p class="sidebar-user__role">${esc(role(emp.role))}</p></div><button type="button" onclick="confirmLogout()" class="btn btn--sidebar shrink-0">Гарах</button></div>` : ""}</div></aside><main class="app-main flex-1 overflow-auto"><div class="app-main__inner max-w-7xl mx-auto">${dataSaveBannerHtml()}${content}</div></main>${scrollTopFabHtml()}${mobileBottomNav(bottomNav)}</div>`;
}
function adminHubCard(view, label, iconKey) {
  const svg =
    ADMIN_METRIC_ICONS[iconKey] ||
    MOBILE_NAV_SVG[view] ||
    ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="event.preventDefault();go('${view}')" class="admin-hub-card"><span class="admin-hub-card__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24">${svg}</svg></span><span class="admin-hub-card__label">${esc(label)}</span><svg class="ui-icon admin-hub-card__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`;
}
function adminHubActionCard(action, label, iconKey) {
  const svg = ADMIN_METRIC_ICONS[iconKey] || ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="${action}" class="admin-hub-card admin-hub-card--settings"><span class="admin-hub-card__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24">${svg}</svg></span><span class="admin-hub-card__label">${esc(label)}</span><svg class="ui-icon admin-hub-card__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`;
}
function adminHubHtml() {
  const main = [
    ["employees", "Ажилтан", "employees", "employees.view"],
    ["inventory", "Нярав", "inventory", "warehouse.view"],
    ["reports", "Борлуулалтын тайлан", "reports", "reports.view"],
    ["promotions", "Урамшуулал", "promotions", "promotions.view"],
    ["warehouseReceipts", "Баримтууд", "stock", "receipts.view"],
    ["count", "Тооллого", "count", "count.view"],
    ["delivery", "Хүргэлт", "delivery", "orders.view"],
    ["employeePermissions", "Эрхийн тохиргоо", "employees", "__permissions__"],
  ].filter(([id, , , perm]) => {
    if (id === "employeePermissions") return canManageEmployeePermissions();
    if (id === "promotions") return canManagePromotions();
    if (id === "warehouseReceipts") return canManageReceipts();
    if (id === "count") return canManageCount();
    return hasPermission(perm);
  });
  const settings = [];
  if (canManageStockAlert()) {
    settings.push(["stockAlertModal()", "Үлдэгдэл сануулах", "stock"]);
  }
  if (canManagePercentDiscountSettings()) {
    settings.push([
      "percentDiscountSettingsModal()",
      "Шууд төлөлтийн хувь оруулах",
      "employees",
    ]);
  }
  if (canManageOrderHistorySettings()) {
    settings.push([
      "orderRetentionSettingsModal()",
      `Захиалгын түүх хадгалах (${orderRetentionDays()} хоног)`,
      "reports",
    ]);
  }
  if (canManageStockAlert() || canManageOrderHistorySettings()) {
    settings.push(["deletionLogModal()", "Устгасан бүртгэл", "inventory"]);
  }
  const settingsHtml = settings.length
    ? `<h3 class="admin-hub__heading admin-hub__heading--settings">Тохиргоо</h3><div class="admin-hub__settings">${settings.map(([action, label, icon]) => adminHubActionCard(action, label, icon)).join("")}</div>`
    : "";
  if (!main.length && !settingsHtml) {
    return `<section class="admin-hub"><p class="text-sm text-muted-foreground">Харах эрхтэй хэсэг байхгүй.</p></section>`;
  }
  return `<section class="admin-hub">${main.length ? `<h3 class="admin-hub__heading">Удирдлага</h3><div class="admin-hub__grid">${main.map(([id, label, icon]) => adminHubCard(id, label, icon)).join("")}</div>` : ""}${settingsHtml}</section>`;
}
function adminView() {
  ensureSettings();
  const lowList = lowStockProducts(),
    low = lowList.length,
    sales = state.employees.length;
  const alertOn = state.settings.stockAlertEnabled !== false;
  const metrics = adminMetricsBar(
    adminMetricCard(
      "Таталт хийх шаардлагатай бараа",
      low,
      low && alertOn ? "text-tone-warning" : "text-tone-success",
      {
        active: low > 0 && alertOn,
        action: "stockAlertModal()",
        icon: "stock",
      },
    ) +
      adminMetricCard("Харилцагч", state.customers.length, "", {
        active: state.customers.length > 0,
        action: "go('customers')",
        icon: "customers",
      }) +
      adminMetricCard("Ажилтан", sales, "", {
        active: sales > 0,
        action: "go('employees')",
        icon: "employees",
      }),
  );
  return `<div class="admin-page space-y-4">${pageHead("Админ")}${metrics}${adminHubHtml()}</div>`;
}
function percentDiscountSettingsModal() {
  if (!canManagePercentDiscountSettings()) return;
  ensureSettings();
  const rate = percentDiscountRate();
  box(
    "Шууд төлөлтийн хувь оруулах",
    `<form onsubmit="savePercentDiscountSettings(event)" class="p-5 space-y-4"><p class="text-sm text-muted-foreground">(Харилцагч хүлээн авсан барааны төлбөрийг шууд төлөх үед хөнгөлөлтийн хэмжээ)</p><label class="block text-sm font-medium">Шууд төлөлтийн хувь (%)</label><input name="percentDiscountRate" type="tel" inputmode="decimal" autocomplete="off" min="0" max="100" step="0.1" required value="${rate}" class="w-full px-3 py-3 bg-secondary rounded app-input"><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="py-2.5 bg-secondary rounded font-medium text-sm">Болих</button><button type="submit" class="py-2.5 bg-primary text-primary-foreground rounded font-medium text-sm">Хадгалах</button></div></form>`,
    "max-w-md",
  );
}
function savePercentDiscountSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const raw = Number(new FormData(e.target).get("percentDiscountRate"));
  state.settings.percentDiscountRate = Math.min(
    100,
    Math.max(0, Number.isFinite(raw) ? raw : RECEIPT_PERCENT_DISCOUNT),
  );
  if (!canApplyPercentDiscount()) state.applyPercentDiscount = false;
  closeModal();
  render();
  showInstallToast("Шууд төлөлтийн хувь хадгалагдлаа");
  criticalBackendSave();
}
function orderRetentionSettingsModal() {
  if (!canManageOrderHistorySettings()) return;
  ensureSettings();
  const days = orderRetentionDays();
  box(
    "Захиалгын түүх хадгалах",
    `<form onsubmit="saveOrderRetentionSettings(event)" class="p-5 space-y-4"><p class="text-sm text-muted-foreground">Захиалгын түүхэнд тохируулсан хугацааны дотор системээс автоматаар устана.</p><label class="block text-sm font-medium">Хадгалах хоног</label><input name="orderRetentionDays" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="7" max="365" required value="${days}" class="w-full px-3 py-3 bg-secondary rounded app-input"><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="py-2.5 bg-secondary rounded font-medium text-sm">Болих</button><button type="submit" class="py-2.5 bg-primary text-primary-foreground rounded font-medium text-sm">Хадгалах</button></div></form>`,
    "max-w-md",
  );
}
function saveOrderRetentionSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const raw = Number(new FormData(e.target).get("orderRetentionDays"));
  state.settings.orderRetentionDays = Math.min(
    365,
    Math.max(7, Number.isFinite(raw) ? Math.floor(raw) : 31),
  );
  closeModal();
  render();
  showInstallToast("Захиалгын түүх хадгалах хугацаа шинэчлэгдлээ");
  criticalBackendSave();
}
function deletionLogLabel(entry) {
  if (!entry) return { type: "-", actor: "-" };
  const type =
    entry.type === "product"
      ? "Бараа"
      : entry.type === "customer"
        ? "Харилцагч"
        : entry.type === "employee"
          ? "Ажилтан"
          : entry.type === "order"
            ? "Баримт / захиалга"
            : String(entry.type || "-");
  const actor =
    state.employees.find((e) => e.id === entry.actorId)?.name ||
    entry.actorId ||
    "-";
  return { type, actor };
}
function deletionLogModal() {
  if (!isAdmin()) return;
  const log = [...normalizeDeletionLog(state.deletionLog || [])]
    .reverse()
    .slice(0, 100);
  const rows = log.length
    ? log
        .map((entry) => {
          const meta = deletionLogLabel(entry);
          const when = entry.deletedAt ? dteAt(entry.deletedAt) : "-";
          return `<tr><td class="px-3 py-2 text-sm">${esc(meta.type)}</td><td class="px-3 py-2 text-sm font-mono">${esc(String(entry.id || "-"))}</td><td class="px-3 py-2 text-sm">${esc(meta.actor)}</td><td class="px-3 py-2 text-sm text-muted-foreground">${esc(when)}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="4" class="px-3 py-6 text-center text-sm text-muted-foreground">Устгасан бүртгэл байхгүй</td></tr>`;
  box(
    "Устгасан бүртгэл",
    `<div class="p-4 space-y-3"><p class="text-sm text-muted-foreground">Бараа эсвэл харилцагч устгагдсаны дараа ID энд бүртгэгдэнэ. Бусад төхөөрөмж sync хийхэд эдгээр ID дахин гарч ирэхгүй.</p><div class="overflow-x-auto rounded border border-border"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-3 py-2 text-left text-xs font-semibold">Төрөл</th><th class="px-3 py-2 text-left text-xs font-semibold">ID</th><th class="px-3 py-2 text-left text-xs font-semibold">Ажилтан</th><th class="px-3 py-2 text-left text-xs font-semibold">Огноо</th></tr></thead><tbody class="divide-y divide-border">${rows}</tbody></table></div><button type="button" onclick="closeModal()" class="w-full py-2.5 bg-secondary rounded font-medium text-sm">Хаах</button></div>`,
    "max-w-2xl",
  );
}
function stockAlertModal() {
  if (!canManageStockAlert()) return;
  ensureSettings();
  const q = (state.searches.stockAlert || "").toLowerCase().trim();
  const alertOn = state.settings.stockAlertEnabled !== false;
  const products = state.products
    .filter(
      (p) =>
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        String(p.barcode || "").includes(q) ||
        (p.category || "").toLowerCase().includes(q),
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "mn"));
  const low = products.filter(isLowStock);
  const rows = products.length
    ? products
        .map((p) => {
          const limit = stockAlertLevel(p);
          const lowNow = isLowStock(p);
          const limitAttr = limit > 0 ? `value="${limit}" ` : "";
          return `<div class="stock-alert-row ${lowNow ? "stock-alert-row--low" : ""}"><img src="${p}" referrerpolicy="no-referrer" data-product-img alt="" class="stock-alert-thumb" width="56" height="56" loading="lazy" decoding="async"><div class="stock-alert-row__info min-w-0"><p class="stock-alert-row__name">${esc(p.name)}</p><p class="stock-alert-row__sub">Үлд <b class="${lowNow ? "text-tone-warning" : ""}">${p.stock ?? 0}</b>${limit > 0 ? ` · доод ${limit}` : ""}</p></div><label class="stock-alert-row__limit shrink-0"><span class="stock-alert-row__limit-label">Доод</span><input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" name="minStock_${esc(p.id)}" min="0" step="1" ${limitAttr}placeholder="0" class="stock-alert-row__input app-input" aria-label="${esc(p.name)} доод үлдэгдэл"></label></div>`;
        })
        .join("")
    : `<p class="text-sm text-muted-foreground text-center py-6">Бараа олдсонгүй</p>`;
  box(
    "Үлдэгдэл сануулах",
    `<form onsubmit="saveStockAlertSettings(event)" class="stock-alert-form p-5 flex flex-col min-h-0 max-h-[85vh]"><div class="stock-alert-form__head shrink-0 flex items-center justify-between gap-3 mb-2"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="stockAlertEnabled" ${alertOn ? "checked" : ""} class="w-4 h-4 rounded"><span>Идэвхтэй</span></label>${low.length ? `<span class="text-sm font-semibold text-tone-warning">Таталт: ${low.length}</span>` : ""}</div><input type="search" value="${esc(state.searches.stockAlert || "")}" oninput="search('stockAlert',this.value);stockAlertModal()" placeholder="Хайх..." class="stock-alert-form__search shrink-0 w-full px-3 py-2 bg-secondary rounded text-sm mb-2"><div class="stock-alert-list modal-scroll flex-1 min-h-0 overflow-y-auto -mx-1 px-1">${rows}</div><div class="stock-alert-form__foot shrink-0 pt-3 mt-2 border-t border-border grid grid-cols-2 gap-2"><button type="button" onclick="closeModal()" class="py-2.5 bg-secondary rounded font-medium text-sm">Болих</button><button type="submit" class="py-2.5 bg-primary text-primary-foreground rounded font-medium text-sm">Хадгалах</button></div></form>`,
    "max-w-xl",
  );
}
function saveStockAlertSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const data = new FormData(e.target);
  const summary = stockAlertChangeSummary(data);
  if (!summary.changed) {
    closeModal();
    return;
  }
  confirmModal("Үлдэгдэл сануулах хадгалах", summary.html, {
    confirmLabel: "Хадгалах",
    onConfirm: () => applyStockAlertSettings(data),
  });
}
function stockAlertChangeSummary(data) {
  const lines = [];
  const alertEnabled = data.get("stockAlertEnabled") === "on";
  const wasEnabled = state.settings.stockAlertEnabled !== false;
  if (alertEnabled !== wasEnabled) {
    lines.push(
      `<p>Сануулга: <b>${alertEnabled ? "идэвхтэй" : "унтраах"}</b></p>`,
    );
  }
  state.products.forEach((p) => {
    const raw = data.get(`minStock_${p.id}`);
    if (raw == null) return;
    const next = Math.max(0, Number(raw) || 0);
    const prev = stockAlertLevel(p);
    if (next !== prev) {
      lines.push(
        `<p><b>${esc(p.name)}</b> — доод үлдэгдэл: ${prev} → ${next}</p>`,
      );
    }
  });
  return {
    changed: lines.length > 0,
    html:
      lines.join("") ||
      `<p class="text-sm text-muted-foreground">Өөрчлөлт олдсонгүй.</p>`,
  };
}
function applyStockAlertSettings(data) {
  if (!isAdmin()) return;
  ensureSettings();
  state.settings.stockAlertEnabled = data.get("stockAlertEnabled") === "on";
  state.products.forEach((p) => {
    const raw = data.get(`minStock_${p.id}`);
    if (raw == null) return;
    p.minStock = Math.max(0, Number(raw) || 0);
  });
  closeModal();
  render();
  showInstallToast("Үлдэгдэл сануулах хадгалагдлаа");
  criticalBackendSave();
}
function orderReceiptRowsFiltered(
  searchKey = "warehouseOrders",
  employeeIds = [],
  opts = {},
) {
  const q = (state.searches[searchKey] || "").toLowerCase();
  const workerIds = idList(opts.workerIds || employeeIds),
    deliveryIds = idList(opts.deliveryIds);
  const skipWarehouseDate = opts.skipWarehouseDate || searchKey === "orders";
  const requireWorkerScope = !!opts.requireWorkerScope;
  let rows = state.orders.filter(
    (o) =>
      (requireWorkerScope
        ? workerIds.length > 0 && workerIds.includes(o.employeeId)
        : !workerIds.length || workerIds.includes(o.employeeId)) &&
      (!deliveryIds.length ||
        deliveryIds.includes(orderDeliveryEmployeeId(o))) &&
      orderReceiptMatchesQuery(o, q) &&
      (state.filters.order === "all" || o.status === state.filters.order),
  );
  if (!skipWarehouseDate) rows = filterWarehouseOrders(rows);
  return sortOrdersBySelectedPeople(rows, workerIds, deliveryIds);
}
function buildOrderReceiptExcelRows(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sales = state.employees.find((e) => e.id === o.employeeId) || {},
    delivery = resolveOrderDelivery(o, receiptPrintDeliveryOpts()),
    addr = customerAddress(c),
    gross = orderGrossTotal(o),
    discount = orderDiscountAmount(o),
    payable = orderPayableTotal(o),
    sub = Math.round(payable / 1.1),
    vat = Math.round(payable - sub),
    pct =
      o.applyPercentDiscount && isCashPayment(o.paymentTerm)
        ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
        : 0,
    paid = o.paymentTerm === "cash" || o.isPaid,
    rows = [
      ["ТОМУДА групп ХХК"],
      ["ЗАРЛАГЫН БАРИМТ", `№${formatReceiptNumber(o)}`],
      ["Захиалгын огноо", dte(o.createdAt)],
      [],
      ["Худалдааны төлөөлөгч", o.employeeName || sales.name || "-"],
      ["Төлөөлөгчийн утас", o.employeePhone || sales.phone || "-"],
      ["Түгээгч", delivery.deliveryName],
      ["Түгээгчийн утас", delivery.deliveryPhone],
      [],
      ["Харилцагч", c.name || o.customerName],
      ["Регистр", c.registrationNumber || "-"],
      ["Компани", c.companyName || "-"],
      ["Утас", customerPhonesList(c).join(", ") || "-"],
      ["Хаяг", addr === "-" ? "" : addr],
      ["Төлбөр", paid ? "Шууд төлөх" : "Дансаар"],
      ["Төлөв", status(o.status)],
      [],
      ["№", "Барааны нэр", "Нэгж", "Баркод", "Тоо/ш", "Нэгж үнэ", "Нийт үнэ"],
    ];
  (o.items || [])
    .filter((i) => !i.isPromoFree)
    .forEach((i, n) => {
      const p = state.products.find((x) => x.id === i.productId) || {};
      rows.push([
        n + 1,
        i.productName,
        p.unit || "ш",
        p.barcode || "-",
        i.quantity,
        resolveOrderItemUnitPrice(i),
        resolveOrderItemLineTotal(i),
      ]);
    });
  const promoItems = (o.items || []).filter((i) => i.isPromoFree);
  if (promoItems.length) {
    rows.push([]);
    rows.push(["Урамшуулал", "Бараа", "Тоо", "Дүн"]);
    promoItems.forEach((i) => rows.push(["", i.productName, i.quantity, 0]));
  }
  rows.push([], ["Хувь хасагдаагүй нийт үнийн дүн", "", "", "", "", "", gross]);
  if (discount)
    rows.push([`Хөнгөлөлт (${pct}%)`, "", "", "", "", "", -discount]);
  rows.push(
    ["Бараа ажил үйлчилгээний дүн", "", "", "", "", "", sub],
    ["НӨАТ", "", "", "", "", "", vat],
    ["Нийт төлөх дүн", "", "", "", "", "", payable],
  );
  const settlement = settlementNoteText(o);
  if (settlement) rows.push([], [settlement]);
  return rows;
}
function orderReceiptSnapshot(o) {
  const snap = {
    ...o,
    items: orderItemsWithPromos(o).map(enrichPromoLineForReceipt),
  };
  const delivery = resolveOrderDelivery(o, receiptPrintDeliveryOpts());
  if (delivery.deliveryEmployeeId) {
    snap.deliveryEmployeeId = delivery.deliveryEmployeeId;
    snap.deliveryName =
      delivery.deliveryName === "-" ? "" : delivery.deliveryName;
    snap.deliveryPhone =
      delivery.deliveryPhone === "-" ? "" : delivery.deliveryPhone;
  }
  return snap;
}
function receiptExcelPage(o, logoSrc) {
  // Same single-sheet layout as Баримтууд on-screen preview.
  return `<div class="receipt-excel-sheet"><div class="receipt-page">${receiptSheetHtml(o, logoSrc)}</div></div>`;
}
const RECEIPT_EXCEL_STYLES = `
body { margin: 0; padding: 0; background: #fff; color: #111; font-family: ${RECEIPT_FONT}; }
table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
td, th { border: none; }
.receipt-excel-sheet { display: block; background: #fff; color: #111; font-family: ${RECEIPT_FONT}; }
.receipt-excel-sheet + .receipt-excel-sheet { page-break-before: always; mso-page-break-before: always; }
.receipt-page { width: 100%; max-width: 194mm; margin: 0 auto; padding: 2mm 1mm 4mm; font-size: 9pt; line-height: 1.25; font-family: ${RECEIPT_FONT}; box-sizing: border-box; min-height: 270mm; background: #fff; }
.receipt-page--footer-only { display: flex; flex-direction: column; }
.receipt-page--footer-only .receipt-grid--sheet { flex: 1 1 auto; height: 100%; }
.receipt-grid { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
.receipt-grid__a { width: 5.6%; } .receipt-grid__b { width: 8.9%; } .receipt-grid__c { width: 14.4%; } .receipt-grid__d { width: 8.9%; } .receipt-grid__e { width: 7.8%; }
.receipt-grid__f { width: 12.2%; } .receipt-grid__g { width: 7.8%; } .receipt-grid__h { width: 7.8%; } .receipt-grid__i { width: 5.6%; } .receipt-grid__j { width: 10%; } .receipt-grid__k { width: 11.1%; }
.receipt-grid--sheet .receipt-grid__header td,
.receipt-grid--sheet .receipt-grid__meta td,
.receipt-grid--sheet .receipt-grid__return td,
.receipt-grid--sheet .receipt-grid__warn td,
.receipt-grid--sheet .receipt-grid__spacer td,
.receipt-grid--sheet .receipt-grid__fill td,
.receipt-grid--sheet .receipt-grid__footnote td,
.receipt-grid--sheet .receipt-grid__settle td,
.receipt-grid--sheet .receipt-grid__sign td,
.receipt-grid--sheet .receipt-grid__gross td,
.receipt-grid--sheet .receipt-grid__summary td,
.receipt-grid--sheet tr.receipt-grid__items-wrap > td { border: none !important; padding: 1.5px 3px; vertical-align: middle; mso-border-alt: none; }
.receipt-grid--sheet tr.receipt-grid__items-wrap > td.receipt-grid__items-cell { padding: 4px 0 6px !important; }
.receipt-items { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
.receipt-items th,
.receipt-items td { border: 1px solid #333 !important; padding: 4px 6px; vertical-align: middle; background: #fff; }
.receipt-items__head th { background: #f0f0f0; font-weight: 700; text-align: center; }
.receipt-items__num { width: 6%; text-align: center; }
.receipt-items__name { width: 34%; text-align: left; }
.receipt-items__unit { width: 12%; text-align: center; }
.receipt-items__barcode { width: 16%; text-align: center; word-break: break-all; }
.receipt-items__qty { width: 8%; text-align: center; }
.receipt-items__price,
.receipt-items__total { width: 12%; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.receipt-items--promo {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.receipt-items--promo th,
.receipt-items--promo td {
  border: none !important;
  background: #fff !important;
  padding: 3px 6px;
}
.receipt-items--promo .receipt-items__promo-note td {
  border: none !important;
  border-bottom: 1px dotted #555 !important;
  background: #fff !important;
  font-weight: 700;
  text-align: left;
  padding: 6px 6px 4px;
}
.receipt-items--promo .receipt-items__promo-title {
  display: inline-block;
  font-weight: 700;
  margin-right: 10px;
}
.receipt-items--promo .receipt-items__promo-settle {
  font-weight: 600;
}
.receipt-items--promo .receipt-items__num { width: 6%; }
.receipt-items--promo .receipt-items__name { width: 34%; text-align: left; }
.receipt-items--promo .receipt-items__unit { width: 12%; }
.receipt-items--promo .receipt-items__barcode { width: 16%; }
.receipt-items--promo .receipt-items__qty { width: 8%; text-align: center; }
.receipt-items--promo .receipt-items__price,
.receipt-items--promo .receipt-items__total {
  width: 12%;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.receipt-items--promo .receipt-items__promo td {
  border: none !important;
  border-bottom: 1px dotted #555 !important;
  background: #fff !important;
}
.receipt-items--promo .receipt-items__promo:last-child td {
  border-bottom: 1px dotted #555 !important;
}
.receipt-grid--sheet .receipt-grid__gross td,
.receipt-grid--sheet .receipt-grid__summary td { padding: 4px 6px; font-size: 9pt; }
.receipt-grid--sheet .receipt-grid__return td { padding: 6px 4px 8px; }
.receipt-grid--sheet .receipt-grid__gross td { border-top: 1px solid #c8c8c8 !important; background: #ececec; }
.receipt-grid--sheet .receipt-grid__summary--grand td { background: #555 !important; color: #fff !important; padding: 7px 8px; }
.receipt-grid--sheet .receipt-grid__summary--pay td { padding-top: 7px; }
.receipt-grid--sheet .receipt-grid__sign-line { border: none !important; border-bottom: 1px dotted #333 !important; }
.receipt-grid__logo-cell { width: 18mm; max-width: 18mm; vertical-align: middle; padding: 0 1mm 0 0; }
.receipt-logo { width: 18mm; height: 18mm; object-fit: contain; display: block; }
.receipt-grid__brand { font-family: ${RECEIPT_FONT_TITLE}; font-size: 12pt; font-weight: 700; vertical-align: middle; padding-left: 0; letter-spacing: 0.02em; }
.receipt-grid__address { font-size: 8pt; line-height: 1.3; vertical-align: top; white-space: normal; padding-left: 0; color: #222; }
.receipt-grid__date-label, .receipt-grid__date { font-size: 9pt; text-align: left; white-space: nowrap; vertical-align: middle; }
.receipt-grid__date { text-align: left; font-weight: 700; }
.receipt-title { text-align: center; font-family: ${RECEIPT_FONT_TITLE}; font-size: 15pt; font-weight: 700; padding: 6px 0 8px; letter-spacing: 0.01em; }
.receipt-grid__meta td { font-size: 9pt; line-height: 1.3; }
.receipt-grid__label { color: #111; white-space: nowrap; font-weight: 400; }
.receipt-grid__value { font-weight: 700; }
.receipt-grid__value--address { white-space: normal; line-height: 1.3; font-weight: 700; }
.receipt-grid__spacer td { height: 5px; padding: 0; }
.receipt-grid__spacer--sign td { height: 8mm; }
.receipt-grid__fill td { height: 42mm; padding: 0; border: none !important; }
.receipt-grid__head { font-weight: 700; text-align: center; background: #f0f0f0; font-size: 9pt; }
.receipt-grid__num { text-align: center; }
.receipt-grid__name { text-align: left; }
.receipt-grid__unit, .receipt-grid__barcode, .receipt-grid__qty { text-align: center; }
.receipt-grid__money { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.receipt-grid__money--strong { font-weight: 700; font-size: 11pt; }
.receipt-grid__money--grand { font-weight: 700; font-size: 12pt; }
.receipt-grid__gross td { font-weight: 700; }
.receipt-grid__gross-label { text-align: left; font-size: 11pt; padding-left: 4px; }
.receipt-grid__gross .receipt-grid__money { font-size: 11pt; text-align: right; padding-right: 4px; }
.receipt-grid__summary-label { background: transparent; font-weight: 400; font-size: 10pt; padding-left: 4px; text-align: left; }
.receipt-grid__summary-label--grand { font-weight: 700; color: #fff !important; }
.receipt-grid__summary-value { text-align: right; font-size: 10pt; padding-right: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.receipt-grid__summary--grand .receipt-grid__summary-value { font-weight: 700; color: #fff !important; }
.receipt-grid__summary-value--grand { font-size: 12pt; }
.receipt-grid__summary-value--pay { font-weight: 700; }
.receipt-grid__settle-text { text-align: center; font-size: 9pt; line-height: 1.35; padding: 6px 8px; background: #f7ecc2; font-weight: 600; }
.receipt-grid__footnote td { border: none; padding: 0; }
.receipt-grid__footnote-text { text-align: center; font-size: 9pt; line-height: 1.35; padding: 6px 4px 2px; }
.receipt-grid__warn td { border: none; padding: 0; }
.receipt-grid__warn-box { background: #ececec !important; text-align: center; padding: 10px 12px !important; border: none !important; }
.receipt-grid__warn-line { margin: 0 0 4px; font-size: 9pt; line-height: 1.4; }
.receipt-grid__warn-line:last-child,
.receipt-grid__warn-line--last { margin-bottom: 0; }
.receipt-grid__warn-line--bold { font-weight: 700; font-style: italic; }
.receipt-grid__sign-label { font-size: 9pt; padding: 12px 2px 6px; vertical-align: bottom; white-space: nowrap; }
.receipt-grid__sign-line { border-bottom: 1px dotted #333 !important; height: 18px; min-height: 18px; vertical-align: bottom; }
.receipt-page--continued { page-break-before: always; break-before: page; }
`;
let receiptExcelLogoDataUri = "";
async function getReceiptExcelLogoDataUri() {
  if (
    receiptExcelLogoDataUri &&
    /^data:image\//i.test(receiptExcelLogoDataUri)
  ) {
    return receiptExcelLogoDataUri;
  }
  try {
    const res = await fetch(staticAssetUrl(BRAND.receiptLogo), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("logo missing");
    const blob = await res.blob();
    receiptExcelLogoDataUri = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        if (!/^data:image\//i.test(result)) {
          reject(new Error("logo not data uri"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    });
    return receiptExcelLogoDataUri;
  } catch {
    // Bundled logo — never leave the receipt header blank.
    receiptExcelLogoDataUri = RECEIPT_LOGO_DATA_URI;
    return RECEIPT_LOGO_DATA_URI;
  }
}
function buildReceiptExcelDocument(orders, logoSrc) {
  const pages = orders
    .map((o) => receiptExcelPage(orderReceiptSnapshot(o), logoSrc))
    .join("");
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<link rel="stylesheet" href="${RECEIPT_FONT_LINK}">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Баримт</x:Name><x:WorksheetOptions><x:Print><x:ValidPrinterInfo/><x:PaperSizeIndex>9</x:PaperSizeIndex></x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${RECEIPT_EXCEL_STYLES}</style>
</head>
<body>${pages}</body>
</html>`;
}
function receiptExcelFileName(orders) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (orders.length === 1) {
    const no = String(formatReceiptNumber(orders[0]) || "1").replace(
      /[^\w.-]+/g,
      "-",
    );
    return `zarlagyn-barimt-${no}.xlsx`;
  }
  return `zarlagyn-barimt-${stamp}.xlsx`;
}
function receiptHtmlFileName(orders) {
  return receiptExcelFileName(orders).replace(/\.xlsx$/i, ".html");
}
function legacyExcelFileName(name) {
  return safeDownloadFileName(
    String(name || "excel.xlsx").replace(/\.(xlsx|xls|csv)$/i, ".xls"),
    "application/vnd.ms-excel",
  );
}
async function downloadReceiptExcelBlob(name, html) {
  // Browsers often open text/html blobs in a tab instead of saving a file.
  // Pack the print-layout HTML (+ logo) into a .zip so download behaves like
  // other Excel exports — a real file — while the template stays intact.
  const htmlName = String(name || "zarlagyn-barimt.html").replace(
    /\.(xlsx|xls|zip)$/i,
    ".html",
  );
  const zipName = htmlName.replace(/\.html?$/i, ".zip");
  const logoBytes = receiptLogoBytesFromDataUri(RECEIPT_LOGO_DATA_URI);
  let docHtml = html;
  if (typeof JSZip !== "undefined") {
    const zip = new JSZip();
    if (logoBytes) {
      zip.file("receipt-logo.png", logoBytes, zipFileOptions({ binary: true }));
      // Prefer relative logo so the unzipped HTML stays small and printable.
      docHtml = String(html || "").replace(
        /src="data:image\/[^"]+"/gi,
        'src="receipt-logo.png"',
      );
    }
    zip.file(htmlName, "\uFEFF" + docHtml, zipFileOptions({ binary: false }));
    const bytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const blob = new Blob([bytes], { type: "application/zip" });
    return downloadBlobFile(blob, zipName, {
      skipShare: !prefersMobileExcelShare(),
      savePicker: !prefersMobileExcelShare(),
    });
  }
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/octet-stream",
  });
  return downloadBlobFile(blob, htmlName, {
    skipShare: true,
    savePicker: true,
  });
}
function exportOrderReceiptsExcelCsv(orders) {
  const stamp = new Date().toISOString().slice(0, 10),
    sheetRows = [
      ["ТОМУДА — Захиалгын баримтууд"],
      [`Тайлан огноо: ${dte(new Date())}`],
      [`Баримтын тоо: ${orders.length}`],
      [],
    ];
  orders.forEach((o, idx) => {
    if (idx > 0) sheetRows.push([], ["--------------------"], []);
    sheetRows.push(...buildOrderReceiptExcelRows(o));
  });
  excel(`zahialgiin-barimt-${stamp}.xlsx`, sheetRows);
}
const RECEIPT_XLSX_LAST_COL = "K";
const RECEIPT_XLSX_TEMPLATE = "/static/tomuda/templates/receipt-template.xls";
const RECEIPT_XLSX_COL_WIDTHS = [5, 8, 13, 8, 6, 10, 6, 6, 5, 9, 10];
function receiptXlsxColsXml() {
  return RECEIPT_XLSX_COL_WIDTHS.map(
    (width, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
  ).join("");
}
function excelSerialFromDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return excelSerialFromDate(new Date());
  return (
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(1899, 11, 30)) /
    86400000
  );
}
function createReceiptStringContext() {
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  return { strings, si };
}
function receiptXlsxStylesXml() {
  // Built-in numFmtIds only: 0 General, 3 #,##0, 4 #,##0.00, 14 date.
  // Borders appear ONLY on item-table styles (borderId 1 = thin gray like print).
  // Everything else is borderless so the sheet matches the print receipt.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="9"><font><sz val="11"/><color rgb="FF000000"/><name val="Arial"/></font><font><sz val="9"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="9"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="18"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF000000"/><name val="Arial"/></font><font><sz val="8"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><i/><sz val="9"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EBEE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F7F7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F7A3F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF808080"/></left><right style="thin"><color rgb="FF808080"/></right><top style="thin"><color rgb="FF808080"/></top><bottom style="thin"><color rgb="FF808080"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF333333"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="34"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="3" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="3" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="bottom"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="3" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="3" fontId="2" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="3" fontId="1" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="3" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="8" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
}
function warehousePrepareStylesXml() {
  return receiptXlsxStylesXml();
}
function receiptDrawingXml() {
  // Fixed 18mm square (print size). oneCellAnchor — do not stretch across wide B column.
  const emu = Math.round((18 / 25.4) * 914400);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>40000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>40000</xdr:rowOff></xdr:from><xdr:ext cx="${emu}" cy="${emu}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="TOMUDA logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
}
function receiptDrawingRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/receipt-logo.png"/></Relationships>`;
}
function receiptSheetRelsXml(sheetId) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetId}.xml"/></Relationships>`;
}
function xlsxParseCellRef(ref) {
  const m = String(ref || "").match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const colLetters = m[1].toUpperCase();
  let col = 0;
  for (const ch of colLetters) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]), ref: `${colLetters}${m[2]}` };
}
function xlsxMergeNonAnchorCells(mergeRefs) {
  const covered = new Set();
  for (const mergeRef of mergeRefs || []) {
    const [startRef, endRef] = String(mergeRef).split(":");
    if (!endRef) continue;
    const start = xlsxParseCellRef(startRef);
    const end = xlsxParseCellRef(endRef);
    if (!start || !end) continue;
    for (let row = start.row; row <= end.row; row += 1) {
      for (let col = start.col; col <= end.col; col += 1) {
        const cell = `${xlsxColName(col)}${row}`;
        if (cell !== start.ref) covered.add(cell);
      }
    }
  }
  return covered;
}
function xlsxSafeSheetName(name, fallback = "Sheet1") {
  const cleaned = String(name || fallback)
    .replace(/[\\/*?:\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || fallback;
}
function filterXlsxCellsOutsideMerges(cells, mergeRefs) {
  const covered = xlsxMergeNonAnchorCells(mergeRefs);
  const seen = new Set();
  const out = [];
  for (const cell of cells || []) {
    const ref = String(cell)
      .match(/\br="([A-Z]+\d+)"/i)?.[1]
      ?.toUpperCase();
    if (!ref || covered.has(ref) || seen.has(ref)) continue;
    seen.add(ref);
    out.push(cell);
  }
  out.sort((a, b) => {
    const ra = xlsxParseCellRef(
      String(a).match(/\br="([A-Z]+\d+)"/i)?.[1] || "",
    );
    const rb = xlsxParseCellRef(
      String(b).match(/\br="([A-Z]+\d+)"/i)?.[1] || "",
    );
    if (!ra || !rb) return 0;
    return ra.col - rb.col;
  });
  return out;
}
function xlsxSafeNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Keep spreadsheet numbers finite and compact so Numbers/Excel Mobile accept them.
  return Math.round(n * 1000) / 1000;
}
function xlsxZipWriteUtf8(zip, path, xml) {
  // Write XML as a UTF-8 string (not pre-encoded bytes). JSZip then encodes
  // consistently; some mobile Excel builds rejected packages whose parts were
  // inserted as raw Uint8Array with mismatched binary flags.
  zip.file(path, String(xml ?? ""), zipFileOptions({ binary: false }));
}
// Appends one receipt's rows/merges starting at startRow; returns next free row.
// Shared collectors let several receipts stack in a single worksheet.
function appendReceiptSheetRows(o, ctx, rows, merges, startRow = 1) {
  const { si } = ctx;
  let rowNum = startRow;
  const hr1 = rowNum;
  const hr2 = rowNum + 1;
  const hr3 = rowNum + 2;
  merges.push(
    `A${hr1}:A${hr2}`,
    `B${hr1}:F${hr1}`,
    `G${hr1}:I${hr1}`,
    `J${hr1}:K${hr1}`,
    `B${hr2}:F${hr2}`,
    `G${hr2}:I${hr2}`,
    `J${hr2}:K${hr2}`,
    `B${hr3}:J${hr3}`,
  );
  const pushRow = (height, cells) => {
    const filtered = filterXlsxCellsOutsideMerges(cells, merges);
    rows.push(xlsxRowXml(rowNum, height, filtered, RECEIPT_XLSX_LAST_COL));
    rowNum += 1;
  };
  // Item table: only anchor cells per merge — avoids inner box borders in Excel.
  const pushItemTableRow = (height, cells) => {
    const filtered = filterXlsxCellsOutsideMerges(cells, merges);
    rows.push(xlsxRowXml(rowNum, height, filtered, RECEIPT_XLSX_LAST_COL));
    rowNum += 1;
  };
  const emptyCells = (
    row,
    from = "A",
    to = RECEIPT_XLSX_LAST_COL,
    style = 1,
  ) => {
    const cols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(from),
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(to) + 1,
    );
    return cols
      .split("")
      .map((col) => xlsxCellXml(`${col}${row}`, style, null, "empty"));
  };
  const pushMetaPairRow = (
    leftLabel,
    leftValue,
    rightLabel = "",
    rightValue = "",
  ) => {
    // Match print HTML: A | B label | C spacer | D:E value | F:H label | I:K value
    const row = rowNum;
    merges.push(`D${row}:E${row}`, `F${row}:H${row}`, `I${row}:K${row}`);
    pushRow(14.25, [
      xlsxCellXml(`A${row}`, 1, null, "empty"),
      xlsxCellXml(`B${row}`, 5, si(leftLabel), "s"),
      xlsxCellXml(`C${row}`, 1, null, "empty"),
      xlsxCellXml(`D${row}`, 4, si(leftValue), "s"),
      xlsxCellXml(`F${row}`, 5, si(rightLabel), "s"),
      xlsxCellXml(`I${row}`, 4, si(rightValue), "s"),
      ...emptyCells(row, "E", "E"),
      ...emptyCells(row, "G", "H"),
      ...emptyCells(row, "J", RECEIPT_XLSX_LAST_COL),
    ]);
  };
  const f = receiptPartyFields(o);
  const receiptNo = formatReceiptNumber(o);
  const items = (o.items || []).filter((i) => !i.isPromoFree);
  const promoItems = (o.items || []).filter((i) => i.isPromoFree);
  const gross = orderGrossTotal(o);
  const payable = orderPayableTotal(o);
  const sub = payable / 1.1;
  const vat = payable - sub;
  // Logo column A only; brand/address start at B (right next to logo).
  pushRow(34, [
    xlsxCellXml(`A${hr1}`, 1, null, "empty"),
    xlsxCellXml(`B${hr1}`, 21, si("ТОМУДА ГРУПП"), "s"),
    xlsxCellXml(`G${hr1}`, 5, si("Хүргэлтийн огноо:"), "s"),
    xlsxCellXml(`J${hr1}`, 18, si(receiptDeliveryDateValue(o)), "s"),
    ...emptyCells(hr1, "H", "I"),
    ...emptyCells(hr1, "K", "K"),
  ]);
  pushRow(34, [
    xlsxCellXml(`A${hr2}`, 1, null, "empty"),
    xlsxCellXml(`B${hr2}`, 2, si(RECEIPT_COMPANY_ADDRESS), "s"),
    xlsxCellXml(`G${hr2}`, 5, si("Хэвлэсэн огноо:"), "s"),
    xlsxCellXml(`J${hr2}`, 18, si(receiptPrintedDateValue()), "s"),
    ...emptyCells(hr2, "H", "I"),
    ...emptyCells(hr2, "K", "K"),
  ]);
  pushRow(31.5, [
    xlsxCellXml(`B${hr3}`, 14, si(`ЗАРЛАГЫН БАРИМТ №${receiptNo}`), "s"),
    ...emptyCells(hr3, "A", "A"),
    ...emptyCells(hr3, "K", RECEIPT_XLSX_LAST_COL),
  ]);
  pushMetaPairRow(
    "Худалдааны төлөөлөгч:",
    f.salesName,
    "Харилцагч:",
    f.customerName,
  );
  pushMetaPairRow(
    "Худалдааны төлөөлөгчийн утас:",
    f.salesPhone,
    "Регистерийн дугаар:",
    f.customerReg,
  );
  pushMetaPairRow(
    "Түгээгчийн нэр:",
    f.deliveryName,
    "Компаний нэр:",
    f.companyName,
  );
  pushMetaPairRow(
    "Түгээгчийн утас:",
    f.deliveryPhone,
    "Утасны дугаар:",
    f.customerPhone,
  );
  pushRow(14.25, emptyCells(rowNum));
  const bankNameRow = rowNum;
  merges.push(
    `B${bankNameRow}:C${bankNameRow}`,
    `D${bankNameRow}:E${bankNameRow}`,
    `F${bankNameRow}:H${bankNameRow}`,
  );
  pushRow(14.25, [
    xlsxCellXml(`A${bankNameRow}`, 1, null, "empty"),
    xlsxCellXml(`B${bankNameRow}`, 5, si("Дансны нэр:"), "s"),
    xlsxCellXml(`D${bankNameRow}`, 4, si("ТОМУДА групп"), "s"),
    xlsxCellXml(`F${bankNameRow}`, 5, si("Хүргэлтийн хаяг:"), "s"),
    ...emptyCells(bankNameRow, "E", "E"),
    ...emptyCells(bankNameRow, "I", RECEIPT_XLSX_LAST_COL),
  ]);
  const bankRegRow = rowNum;
  merges.push(
    `B${bankRegRow}:C${bankRegRow}`,
    `D${bankRegRow}:E${bankRegRow}`,
    `F${bankRegRow}:K${bankRegRow}`,
  );
  pushRow(14.25, [
    xlsxCellXml(`A${bankRegRow}`, 1, null, "empty"),
    xlsxCellXml(`B${bankRegRow}`, 5, si("Регистерийн дугаар:"), "s"),
    xlsxCellXml(`D${bankRegRow}`, 4, si("5397987"), "s"),
    xlsxCellXml(`F${bankRegRow}`, 4, si(f.address), "s"),
    ...emptyCells(bankRegRow, "E", "E"),
  ]);
  const bankTitleRow = rowNum;
  merges.push(
    `B${bankTitleRow}:C${bankTitleRow}`,
    `D${bankTitleRow}:E${bankTitleRow}`,
  );
  pushRow(14.25, [
    xlsxCellXml(`A${bankTitleRow}`, 1, null, "empty"),
    xlsxCellXml(`B${bankTitleRow}`, 5, si("Банкны нэр:"), "s"),
    xlsxCellXml(`D${bankTitleRow}`, 4, si("Хаан банк"), "s"),
    ...emptyCells(bankTitleRow, "E", RECEIPT_XLSX_LAST_COL),
  ]);
  const bankAcctRow = rowNum;
  merges.push(
    `B${bankAcctRow}:C${bankAcctRow}`,
    `D${bankAcctRow}:E${bankAcctRow}`,
  );
  pushRow(14.25, [
    xlsxCellXml(`A${bankAcctRow}`, 1, null, "empty"),
    xlsxCellXml(
      `B${bankAcctRow}`,
      5,
      si("Дансны дугаар:                     IBAN:      "),
      "s",
    ),
    xlsxCellXml(`D${bankAcctRow}`, 4, si("60000500"), "s"),
    ...emptyCells(bankAcctRow, "E", RECEIPT_XLSX_LAST_COL),
  ]);
  const bankAcctRow2 = rowNum;
  merges.push(`D${bankAcctRow2}:E${bankAcctRow2}`);
  pushRow(14.25, [
    xlsxCellXml(`A${bankAcctRow2}`, 1, null, "empty"),
    ...emptyCells(bankAcctRow2, "B", "C"),
    xlsxCellXml(`D${bankAcctRow2}`, 4, si("5133333307"), "s"),
    ...emptyCells(bankAcctRow2, "E", RECEIPT_XLSX_LAST_COL),
  ]);
  pushRow(14.25, emptyCells(rowNum));
  const headerRow = rowNum;
  // Print columns: № | нэр(B:D) | нэгж | баркод(F:G) | тоо(H:I) | үнэ | нийт
  merges.push(
    `B${headerRow}:D${headerRow}`,
    `F${headerRow}:G${headerRow}`,
    `H${headerRow}:I${headerRow}`,
  );
  pushItemTableRow(18, [
    xlsxCellXml(`A${headerRow}`, 7, si("№"), "s"),
    xlsxCellXml(`B${headerRow}`, 7, si("Барааны нэр"), "s"),
    xlsxCellXml(`E${headerRow}`, 7, si("Хэмжих нэгж"), "s"),
    xlsxCellXml(`F${headerRow}`, 7, si("Баркод"), "s"),
    xlsxCellXml(`H${headerRow}`, 7, si("Тоо/ш"), "s"),
    xlsxCellXml(`J${headerRow}`, 7, si("Нэгж үнэ"), "s"),
    xlsxCellXml(`K${headerRow}`, 7, si("Нийт үнэ"), "s"),
  ]);
  const pushItemLikeRow = (item, index, { promo = false } = {}) => {
    const p = item
      ? state.products.find((x) => x.id === item.productId) ||
        productForReceiptLine(item) ||
        {}
      : {};
    const r = rowNum;
    const unitPrice = promo
      ? receiptPromoDisplayPrice(item)
      : resolveOrderItemUnitPrice(item);
    const lineTotal = promo
      ? receiptPromoDisplayTotal(item)
      : resolveOrderItemLineTotal(item);
    const qty = Number(item.quantity) || 0;
    const nameStyle = 8;
    const unitStyle = 9;
    const barcodeStyle = 9;
    const qtyStyle = 9;
    const moneyStyle = 10;
    const numStyle = 9;
    const barcodeText = promo
      ? ""
      : String(p.barcode || item.barcode || "").trim() || "-";
    const nameText = String(item.productName || "").trim() || "-";
    const unitText = promo
      ? ""
      : String(p.unit || item.unit || "ш").trim() || "ш";
    merges.push(`B${r}:D${r}`, `F${r}:G${r}`, `H${r}:I${r}`);
    pushItemTableRow(17, [
      promo
        ? xlsxCellXml(`A${r}`, numStyle, null, "empty")
        : xlsxCellXml(`A${r}`, numStyle, si(String(index + 1)), "s"),
      xlsxCellXml(`B${r}`, nameStyle, si(nameText), "s"),
      xlsxCellXml(`E${r}`, unitStyle, unitText ? si(unitText) : null, unitText ? "s" : "empty"),
      xlsxCellXml(`F${r}`, barcodeStyle, barcodeText ? si(barcodeText) : null, barcodeText ? "s" : "empty"),
      xlsxCellXml(`H${r}`, qtyStyle, si(String(qty)), "s"),
      xlsxCellXml(`J${r}`, moneyStyle, si(receiptMoney(unitPrice)), "s"),
      xlsxCellXml(`K${r}`, moneyStyle, si(receiptMoney(lineTotal)), "s"),
    ]);
  };
  const pushPromoProductRow = (item) => {
    const r = rowNum;
    const unitPrice = receiptPromoDisplayPrice(item);
    const lineTotal = receiptPromoDisplayTotal(item);
    const qty = Number(item.quantity) || 0;
    const nameText = String(item.productName || "").trim() || "-";
    // Same column anchors as paid items so Тоо/ш · үнэ · нийт line up with the table above.
    merges.push(`B${r}:D${r}`, `F${r}:G${r}`, `H${r}:I${r}`);
    pushItemTableRow(17, [
      xlsxCellXml(`A${r}`, 1, null, "empty"),
      xlsxCellXml(`B${r}`, 5, si(nameText), "s"),
      xlsxCellXml(`E${r}`, 1, null, "empty"),
      xlsxCellXml(`F${r}`, 1, null, "empty"),
      xlsxCellXml(`H${r}`, 6, si(String(qty)), "s"),
      xlsxCellXml(`J${r}`, 3, si(receiptMoney(unitPrice)), "s"),
      xlsxCellXml(`K${r}`, 3, si(receiptMoney(lineTotal)), "s"),
    ]);
  };
  const pushSummaryAmountRow = (
    label,
    amount,
    { grand = false, decimals = false } = {},
  ) => {
    const r = rowNum;
    merges.push(`B${r}:J${r}`);
    const labelStyle = grand ? 31 : 30;
    const valueStyle = grand ? 32 : decimals ? 29 : 12;
    pushRow(14.25, [
      xlsxCellXml(`A${r}`, 1, null, "empty"),
      xlsxCellXml(`B${r}`, labelStyle, si(label), "s"),
      xlsxCellXml(`K${r}`, valueStyle, Number(amount) || 0, "n"),
      ...emptyCells(r, "C", "J", labelStyle),
    ]);
  };
  const pushSummaryTextRow = (label, value) => {
    const r = rowNum;
    merges.push(`B${r}:J${r}`);
    pushRow(14.25, [
      xlsxCellXml(`A${r}`, 1, null, "empty"),
      xlsxCellXml(`B${r}`, 30, si(label), "s"),
      xlsxCellXml(`K${r}`, 4, si(String(value ?? "")), "s"),
      ...emptyCells(r, "C", "J", 30),
    ]);
  };
  items.forEach((item, index) => pushItemLikeRow(item, index));
  const returnRow = rowNum;
  merges.push(`B${returnRow}:C${returnRow}`, `D${returnRow}:K${returnRow}`);
  pushRow(14.25, [
    xlsxCellXml(`A${returnRow}`, 1, null, "empty"),
    xlsxCellXml(`B${returnRow}`, 5, si("Буцаалтын тэмдэглэгээ:"), "s"),
    ...emptyCells(returnRow, "D", RECEIPT_XLSX_LAST_COL),
  ]);
  const grossRow = rowNum;
  merges.push(`B${grossRow}:J${grossRow}`);
  pushRow(16.5, [
    xlsxCellXml(`A${grossRow}`, 1, null, "empty"),
    xlsxCellXml(`B${grossRow}`, 19, si("Хувь хасагдаагүй нийт үнийн дүн"), "s"),
    xlsxCellXml(`K${grossRow}`, 20, gross, "n"),
    ...emptyCells(grossRow, "C", "J", 19),
  ]);
  const promoLines = promoItems.map(enrichPromoLineForReceipt);
  const promoSettleNote = receiptPromoSettleNote(o);
  if (promoLines.length) {
    const bannerRow = rowNum;
    merges.push(`B${bannerRow}:K${bannerRow}`);
    const bannerText = promoSettleNote
      ? `Урамшуулал  ${promoSettleNote}`
      : "Урамшуулал";
    pushRow(16.5, [
      xlsxCellXml(`A${bannerRow}`, 1, null, "empty"),
      xlsxCellXml(`B${bannerRow}`, 4, si(bannerText), "s"),
      ...emptyCells(bannerRow, "C", RECEIPT_XLSX_LAST_COL, 4),
    ]);
    promoLines.forEach((item) => pushPromoProductRow(item));
  }
  pushSummaryAmountRow("Бараа ажил үйлчилгээний дүн", sub, { decimals: true });
  pushSummaryAmountRow("НӨАТ", vat, { decimals: true });
  const grandNote = receiptGrandNote(o);
  const grandLabel = grandNote
    ? `Таны нийт төлөх дүн ${grandNote}`
    : "Таны нийт төлөх дүн";
  pushSummaryAmountRow(grandLabel, payable, { grand: true });
  const settleRow = rowNum;
  merges.push(`B${settleRow}:K${settleRow}`);
  pushRow(27, [
    xlsxCellXml(`A${settleRow}`, 1, null, "empty"),
    xlsxCellXml(`B${settleRow}`, 16, si(receiptSettleNoteText(o)), "s"),
    ...emptyCells(settleRow, "C", RECEIPT_XLSX_LAST_COL, 16),
  ]);
  const payTerm = receiptPaymentTermText(f, o);
  pushSummaryTextRow("Төлбөрийн нөхцөл", payTerm);
  [
    [
      "Эрхэм харилцагч та төлбөрөө заавал баримт дээрх компанийн дансанд шилжүүлж гүйлгээний утга дээр дэлгүүрийн нэр, ААН-ийн РЕГИСТР-ийг бичээрэй.",
      22,
    ],
    ["Хувь хүний дансанд шилжүүлэхгүй байхыг анхаараарай.", 23],
    [
      "Өөр дансруу шилжүүлсэн төлбөрийг нийлүүлэгч компани хариуцахгүй болно",
      22,
    ],
    [
      "Барааг сайтар шалгаж тоо ширхэгийг тулгаж хүлээн авахыг анхаарна уу!",
      22,
    ],
  ].forEach(([text, style], index) => {
    const r = rowNum;
    merges.push(`B${r}:K${r}`);
    pushRow(index === 0 ? 25.5 : 14.25, [
      xlsxCellXml(`A${r}`, 1, null, "empty"),
      xlsxCellXml(`B${r}`, style, si(text), "s"),
      ...emptyCells(r, "C", RECEIPT_XLSX_LAST_COL, style),
    ]);
  });
  pushRow(18, emptyCells(rowNum));
  const sign1 = rowNum;
  merges.push(`B${sign1}:E${sign1}`, `F${sign1}:K${sign1}`);
  pushRow(22, [
    xlsxCellXml(`A${sign1}`, 1, null, "empty"),
    xlsxCellXml(`B${sign1}`, 5, si("Хүлээлгэн өгсөн ажилтны гарын үсэг:"), "s"),
    xlsxCellXml(`F${sign1}`, 17, null, "empty"),
    ...emptyCells(sign1, "G", RECEIPT_XLSX_LAST_COL, 17),
  ]);
  pushRow(14.25, emptyCells(rowNum));
  const sign2 = rowNum;
  merges.push(`B${sign2}:E${sign2}`, `F${sign2}:K${sign2}`);
  pushRow(22, [
    xlsxCellXml(`A${sign2}`, 1, null, "empty"),
    xlsxCellXml(`B${sign2}`, 5, si("Хүлээн авсан ажилтны гарын үсэг:"), "s"),
    xlsxCellXml(`F${sign2}`, 17, null, "empty"),
    ...emptyCells(sign2, "G", RECEIPT_XLSX_LAST_COL, 17),
  ]);
  pushRow(14.25, emptyCells(rowNum));
  return rowNum;
}
function receiptWorksheetXml(rows, merges, lastRow, { hasLogo = false } = {}) {
  const uniqueMerges = [...new Set(merges)];
  const mergeXml = uniqueMerges
    .map((ref) => `<mergeCell ref="${ref}"/>`)
    .join("");
  const mergeCellsXml = uniqueMerges.length
    ? `<mergeCells count="${uniqueMerges.length}">${mergeXml}</mergeCells>`
    : "";
  // ECMA-376 order: mergeCells → pageMargins → pageSetup → drawing
  const drawingXml = hasLogo ? `<drawing r:id="rId1"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${RECEIPT_XLSX_LAST_COL}${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols>${receiptXlsxColsXml()}</cols><sheetData>${rows.join("")}</sheetData>${mergeCellsXml}<pageMargins left="0.45" right="0.45" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>${drawingXml}</worksheet>`;
}
function buildReceiptSheetXml(
  o,
  ctx = createReceiptStringContext(),
  opts = {},
) {
  const rows = [];
  const merges = [];
  const nextRow = appendReceiptSheetRows(o, ctx, rows, merges, 1);
  return {
    sharedStringsXml: xlsxSharedStringsXml(ctx.strings),
    sheetXml: receiptWorksheetXml(rows, merges, nextRow - 1, {
      hasLogo: !!opts.hasLogo,
    }),
    sheetName: xlsxSafeSheetName(
      opts.sheetName || `Баримт ${formatReceiptNumber(o)}`,
      "Баримт",
    ),
  };
}
// All receipts stacked into one worksheet so the export can reuse the
// known-good template package (same mechanism as the warehouse sheet).
function buildReceiptsCombinedSheetXml(
  orders,
  ctx = createReceiptStringContext(),
  opts = {},
) {
  const rows = [];
  const merges = [];
  let rowNum = 1;
  orders.forEach((o, index) => {
    if (index > 0) {
      rows.push(xlsxRowXml(rowNum, 14.25, [], RECEIPT_XLSX_LAST_COL));
      rowNum += 1;
    }
    rowNum = appendReceiptSheetRows(o, ctx, rows, merges, rowNum);
  });
  return {
    sharedStringsXml: xlsxSharedStringsXml(ctx.strings),
    sheetXml: receiptWorksheetXml(rows, merges, Math.max(1, rowNum - 1), {
      hasLogo: !!opts.hasLogo,
    }),
  };
}
function buildReceiptWorkbookXml(orders, opts = {}) {
  const ctx = createReceiptStringContext();
  const usedNames = new Set();
  const mobile = !!opts.mobileSafe;
  const sheets = orders.map((order, index) => {
    const built = buildReceiptSheetXml(order, ctx, {
      sheetName: mobile ? `Receipt ${index + 1}` : `Баримт ${index + 1}`,
      hasLogo: opts.hasLogo,
    });
    let name = xlsxSafeSheetName(built.sheetName, `Sheet${index + 1}`);
    if (usedNames.has(name)) {
      name = xlsxSafeSheetName(`${name} ${index + 1}`, `Sheet${index + 1}`);
    }
    usedNames.add(name);
    return { id: index + 1, name, sheetXml: built.sheetXml };
  });
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView windowWidth="18000" windowHeight="12000"/></bookViews><sheets>${sheets.map((s) => `<sheet name="${xlsxXmlEsc(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join("")}</sheets></workbook>`;
  return {
    sharedStringsXml: xlsxSharedStringsXml(ctx.strings),
    sheets,
    workbookXml,
  };
}
function receiptLogoBytesFromDataUri(dataUri = RECEIPT_LOGO_DATA_URI) {
  const m = String(dataUri || "").match(/^data:image\/\w+;base64,(.+)$/i);
  if (!m) return null;
  const bin = atob(m[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.byteLength > 100 ? bytes.buffer : null;
}
async function loadReceiptExcelLogoBuffer() {
  // Always start from the bundled logo so export never depends on network.
  let buf = receiptLogoBytesFromDataUri(RECEIPT_LOGO_DATA_URI);
  try {
    const dataUri = await getReceiptExcelLogoDataUri();
    const fromFetch = receiptLogoBytesFromDataUri(dataUri);
    if (fromFetch) buf = fromFetch;
  } catch {
    /* keep bundled */
  }
  return buf;
}
function applyReceiptLogoFiles(zip, { hasLogo, logoBuffer, sheetId = 1 } = {}) {
  const drawingPath = `xl/drawings/drawing${sheetId}.xml`;
  const drawingRelsPath = `xl/drawings/_rels/drawing${sheetId}.xml.rels`;
  const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetId}.xml.rels`;
  if (!hasLogo || !logoBuffer) {
    zip.remove(drawingPath);
    zip.remove(drawingRelsPath);
    zip.remove(sheetRelsPath);
    if (sheetId === 1) zip.remove("xl/media/receipt-logo.png");
    return;
  }
  zip.file(drawingPath, receiptDrawingXml(), zipFileOptions({ binary: false }));
  zip.file(
    drawingRelsPath,
    receiptDrawingRelsXml(),
    zipFileOptions({ binary: false }),
  );
  zip.file(
    sheetRelsPath,
    receiptSheetRelsXml(sheetId),
    zipFileOptions({ binary: false }),
  );
  zip.file(
    "xl/media/receipt-logo.png",
    logoBuffer,
    zipFileOptions({ binary: true }),
  );
}
async function exportOrderReceiptsExcelXlsx(orders) {
  if (typeof JSZip === "undefined") throw new Error("JSZip missing");
  const logoBuffer = await loadReceiptExcelLogoBuffer().catch(() => null);
  const hasLogo = !!logoBuffer;
  const { sharedStringsXml, sheetXml } = buildReceiptsCombinedSheetXml(
    orders,
    createReceiptStringContext(),
    { hasLogo },
  );
  const tpl = await fetch(staticAssetUrl(RECEIPT_XLSX_TEMPLATE)).then((r) => {
    if (!r.ok) throw new Error("template missing");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  zip.file("xl/styles.xml", receiptXlsxStylesXml());
  zip.remove("xl/printerSettings/printerSettings1.bin");
  if (hasLogo) {
    applyReceiptLogoFiles(zip, { hasLogo: true, logoBuffer, sheetId: 1 });
    let ct = await zip.file("[Content_Types].xml").async("string");
    if (!/Extension="png"/i.test(ct)) {
      ct = ct.replace(
        "</Types>",
        '<Default Extension="png" ContentType="image/png"/></Types>',
      );
    }
    if (!ct.includes("/xl/drawings/drawing1.xml")) {
      ct = ct.replace(
        "</Types>",
        '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
      );
    }
    // Drop unused printerSettings content type noise if present without file.
    zip.file("[Content_Types].xml", ct, zipFileOptions({ binary: false }));
  } else {
    console.warn("Receipt logo missing — exporting without logo");
    zip.remove("xl/worksheets/_rels/sheet1.xml.rels");
  }
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, receiptExcelFileName(orders));
}
async function exportOrderReceiptsExcelLegacy(orders) {
  // Use bundled logo synchronously so download can start without an async gap
  // that drops the user-gesture (Safari then refuses file download).
  const html = buildReceiptExcelDocument(orders, RECEIPT_LOGO_DATA_URI);
  return downloadReceiptExcelBlob(receiptHtmlFileName(orders), html);
}
async function exportOrderReceiptsExcel(orders) {
  if (!orders.length) return alert("Захиалга олдсонгүй");
  // HTML file matches the on-screen/print template (logo + item table).
  // XLSX mangled merges/borders; keep it only as a last-resort fallback.
  try {
    await exportOrderReceiptsExcelLegacy(orders);
    showInstallToast("Мэдээлэл татагдлаа");
  } catch (err) {
    console.warn("Receipt HTML export failed, trying xlsx", err);
    try {
      await exportOrderReceiptsExcelXlsx(orders);
      showInstallToast("Мэдээлэл татагдлаа");
    } catch (fallbackErr) {
      console.error("Receipt excel export failed", fallbackErr);
      alertModal(
        "Мэдээлэл татах амжилтгүй",
        "Баримтын файл үүсгэхэд алдаа гарлаа. Хуудсыг дахин ачаалаад дахин оролдоно уу.",
      );
    }
  }
}
function orderReceiptExportSnapshots(
  searchKey = "warehouseOrders",
  employeeIds = [],
  opts = {},
) {
  const filtered = orderReceiptRowsFiltered(searchKey, employeeIds, opts);
  const selectedIds = idList(state.receiptPrintOrderIds);
  if (selectedIds.length) {
    const picked = filtered.filter((o) => selectedIds.includes(String(o.id)));
    if (picked.length) return picked.map(orderReceiptSnapshot);
  }
  return filtered.map(orderReceiptSnapshot);
}
function confirmVisibleOrderReceiptsExcel(searchKey = "warehouseOrders") {
  confirmOrderReceiptsExcel(searchKey, [], receiptFilterOptions());
}
function warehouseReceiptToolbarActionsHtml(
  exportOnclick,
  { hasOrders = true } = {},
) {
  const workerIds = receiptPrintWorkerIds(),
    selectedCount = idList(state.receiptPrintOrderIds).length,
    printBtn = workerIds.length
      ? `<button type="button" onclick="printSelectedOrderReceipts()" class="btn btn--secondary btn--toolbar wh-receipts__print"${selectedCount ? "" : " disabled"} aria-label="Баримт хэвлэх"><span class="btn--toolbar__label btn--toolbar__label--full">Хэвлэх</span><span class="btn--toolbar__label btn--toolbar__label--short">Хэвлэх</span></button>`
      : "";
  return `${printBtn}${excelDownloadBtn(exportOnclick, { disabled: !hasOrders, extraClass: "wh-receipts__export" })}`;
}
function confirmWarehouseReceiptsExcel(
  searchKey = "warehouseOrders",
  employeeIds = [],
) {
  confirmOrderReceiptsExcel(searchKey, employeeIds, {
    workerIds: receiptPrintWorkerIds(),
    deliveryIds: receiptPrintDeliveryIds(),
    requireWorkerScope: receiptPrintWorkerIds().length > 0,
  });
}
function confirmOrderReceiptsExcel(
  searchKey = "warehouseOrders",
  employeeIds = [],
  opts = {},
) {
  const rows = orderReceiptExportSnapshots(searchKey, employeeIds, opts);
  if (!rows.length) {
    return alert(
      idList(state.receiptPrintOrderIds).length
        ? "Мэдээлэл татах захиалга сонгоно уу"
        : "Захиалга олдсонгүй",
    );
  }
  confirmDataExport("Мэдээлэл татах", () => exportOrderReceiptsExcel(rows));
}
function confirmSingleOrderReceiptExcel(orderId) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return alert("Захиалга олдсонгүй");
  confirmDataExport("Мэдээлэл татах", () =>
    exportOrderReceiptsExcel([orderReceiptSnapshot(o)]),
  );
}
function ordersView() {
  return `<div class="space-y-5">${orderReceiptsPanel({ title: "Захиалга", searchKey: "orders", showCreate: true })}</div>`;
}
function orderReceiptsPanel({
  title = "Захиалгын баримтууд",
  searchKey = "warehouseOrders",
  employeeIds = [],
  showCreate = false,
  compact = false,
  requireWorkerScope = false,
} = {}) {
  const q = state.searches[searchKey] || "",
    filters = compact ? receiptFilterOptions() : {},
    rows = orderReceiptRowsFiltered(searchKey, employeeIds, {
      ...filters,
      requireWorkerScope,
    });
  if (compact)
    return warehouseReceiptsPanel(rows, { title, searchKey, employeeIds });
  const exportBtn = excelDownloadBtn(
    `confirmOrderReceiptsExcel('${esc(searchKey)}', ${JSON.stringify(employeeIds)})`,
  );
  const toolbarFilters = `${pageToolbarSearch({ focusKey: searchKey, value: q, placeholder: "Хайх..." })}<select onchange="setOrderStatusFilter(this.value)"${pageToolbarSelectHandlers()} class="page-toolbar__select app-input"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select>`;
  const toolbarActions = `${exportBtn}${showCreate ? pageToolbarPrimaryBtn("+ Шинэ", "orderModal()") : ""}`;
  return `<section class="bg-card rounded overflow-hidden"><div class="p-3 border-b border-border"><h2 class="page-head__title">${title}</h2></div><div class="px-3 pb-3">${pageToolbarHtml({ filters: toolbarFilters, actions: toolbarActions })}</div><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-4 py-3 text-left text-xs font-semibold">Захиалга</th><th class="px-4 py-3 text-left text-xs font-semibold">Ажилтан</th><th class="px-4 py-3 text-left text-xs font-semibold">Бараа</th><th class="px-4 py-3 text-left text-xs font-semibold">Төлөв</th><th class="px-4 py-3 text-right text-xs font-semibold">Дүн</th><th class="px-4 py-3 text-right text-xs font-semibold">Үйлдэл</th></tr></thead><tbody class="divide-y divide-border">${rows.map(orderRow).join("")}</tbody></table></div>${rows.length ? "" : `<div class="p-12 text-center text-muted-foreground">Захиалга олдсонгүй</div>`}</section>`;
}
function warehouseOrderStatusActions(o) {
  if (o.status === "pending") {
    let html = `<button type="button" onclick="setOrder('${o.id}','confirmed')" class="btn btn--sm tone tone--success">Батлах</button>`;
    if (canDelete())
      html += `<button type="button" onclick="confirmCancelOrder('${o.id}')" class="btn btn--sm tone tone--danger">Цуцлах</button>`;
    return html;
  }
  if (o.status === "confirmed")
    return `<button type="button" onclick="setOrder('${o.id}','delivered')" class="btn btn--sm tone tone--info">Хүргэсэн</button>`;
  return "";
}
function warehouseReceiptListItem(o) {
  const active = state.selectedWarehouseOrderId === o.id;
  return `<button type="button" onclick="selectWarehouseOrder('${esc(o.id)}')" class="wh-receipt-list__item${active ? " is-active" : ""}">${receiptNo(o, "sm")}<span class="wh-receipt-list__body"><span class="wh-receipt-list__name">${esc(o.customerName)}</span><span class="wh-receipt-list__meta">${fmt(orderAmount(o))} · ${dte(o.createdAt)}</span></span></button>`;
}
function warehouseReceiptPrintListItem(o) {
  const active = state.selectedWarehouseOrderId === o.id,
    checked = idList(state.receiptPrintOrderIds).includes(o.id);
  return `<div class="wh-receipt-list__item wh-receipt-list__item--selectable${active ? " is-active" : ""}"><label class="wh-receipt-list__check"><input type="checkbox"${checked ? " checked" : ""} onchange="toggleReceiptPrintOrder('${esc(o.id)}')" aria-label="Захиалга ${esc(formatReceiptNumber(o))} сонгох"><span class="sr-only">${esc(o.customerName)}</span></label><button type="button" onclick="selectWarehouseOrder('${esc(o.id)}')" class="wh-receipt-list__body-btn">${receiptNo(o, "sm")}<span class="wh-receipt-list__body"><span class="wh-receipt-list__name">${esc(o.customerName)}</span><span class="wh-receipt-list__meta">${fmt(orderAmount(o))} · ${dte(o.createdAt)}</span></span></button></div>`;
}
function warehouseReceiptStatusOptions(includeDelivered = true) {
  const opts = ["pending", "confirmed", "delivered", "cancelled"];
  return includeDelivered ? opts : opts.filter((s) => s !== "delivered");
}
function warehouseReceiptsPanel(rows, { title, searchKey, employeeIds }) {
  const statusOptions = warehouseReceiptStatusOptions(false);
  if (!["all", ...statusOptions].includes(state.filters.order))
    state.filters.order = "all";
  if (state.filters.order === "delivered") state.filters.order = "all";
  const workerIds = receiptPrintWorkerIds(),
    sourceRows = workerIds.length ? receiptPrintWorkerOrders(workerIds) : rows,
    displayRows = sourceRows.filter((o) => o.status !== "delivered");
  if (workerIds.length) syncReceiptPrintSelection(displayRows);
  else {
    state.receiptPrintOrderIds = [];
    state.receiptPrintWorkerSyncKey = "";
  }
  // Keep the user's selected receipt; never auto-jump to another one
  // (e.g. after delete). Invalid/missing selection shows empty detail.
  if (
    state.selectedWarehouseOrderId &&
    !displayRows.some((o) => o.id === state.selectedWarehouseOrderId)
  ) {
    state.selectedWarehouseOrderId = "";
    warehouseReceiptScrollId = "";
  }
  if (!displayRows.length) state.selectedWarehouseOrderId = "";
  const selected = displayRows.find(
      (o) => o.id === state.selectedWarehouseOrderId,
    ),
    listHtml = displayRows.length
      ? displayRows
          .map(
            workerIds.length
              ? warehouseReceiptPrintListItem
              : warehouseReceiptListItem,
          )
          .join("")
      : `<p class="wh-receipt-list__empty">Захиалга олдсонгүй</p>`,
    detailHtml = selected
      ? warehouseOrderDetail(selected)
      : `<div class="wh-receipt-detail wh-receipt-detail--empty"><p>Баримт сонгоно уу</p></div>`;
  const q = state.searches[searchKey] || "",
    exportBtn = warehouseReceiptToolbarActionsHtml(
      `confirmWarehouseReceiptsExcel('${esc(searchKey)}', ${JSON.stringify(employeeIds)})`,
      { hasOrders: displayRows.length > 0 },
    ),
    toolbarFilters = `${pageToolbarSearch({ focusKey: searchKey, value: q, placeholder: "Хайх..." })}${warehouseDateFiltersHtml()}<select onchange="setOrderStatusFilter(this.value)" onfocus="receiptStatusFilterFocus()" onblur="receiptStatusFilterBlur()" ontouchstart="receiptStatusFilterFocus()" class="page-toolbar__select wh-receipts__filter app-input"><option value="all">Бүгд</option>${statusOptions
      .map(
        (s) =>
          `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`,
      )
      .join("")}</select>`;
  return `<section class="wh-receipts"><header class="wh-receipts__head"><div class="wh-receipts__head-main">${canPageBack() ? pageBackBtnHtml() : ""}<h2 class="wh-receipts__title">${title}</h2></div><div class="wh-receipts__head-filters">${receiptPrintWorkerSelectHtml()}${receiptPrintDeliverySelectHtml()}</div></header><div class="wh-receipts__filters">${pageToolbarHtml({ filters: toolbarFilters, actions: exportBtn })}</div><div class="wh-receipts__layout"><div class="wh-receipt-list">${listHtml}</div><div class="wh-receipt-detail-wrap">${detailHtml}</div></div></section>`;
}
function warehouseOrderDetail(o) {
  ensureReceiptScreenStyles();
  const snap = orderReceiptSnapshot(o);
  const docHtml = receiptSheetHtml(snap, RECEIPT_LOGO_DATA_URI);
  return `<div class="wh-receipt-detail wh-receipt-preview"><div class="wh-receipt-preview__scroll"><div class="wh-receipt-preview__doc receipt-page">${docHtml}</div></div><div class="wh-receipt-detail__bar"><div class="wh-receipt-detail__btns"><button type="button" onclick="printOrderReceipt('${esc(o.id)}', event)" class="btn btn--secondary btn--toolbar">Хэвлэх</button>${excelDownloadBtn(`downloadOrderReceiptExcel('${esc(o.id)}', event)`)}${canDeleteReceipt() ? `<button type="button" onclick="confirmDeleteReceipt('${esc(o.id)}')" class="btn btn--danger btn--toolbar">Устгах</button>` : ""}</div></div></div>`;
}
function ensureReceiptScreenStyles() {
  let el = document.getElementById("tomuda-receipt-screen-styles");
  if (!el) {
    el = document.createElement("style");
    el.id = "tomuda-receipt-screen-styles";
    document.head.appendChild(el);
  }
  el.textContent = `${RECEIPT_EXCEL_STYLES}
.wh-receipt-preview {
  gap: 14px;
  padding: 0;
  background: transparent;
  border: none;
}
.wh-receipt-preview__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--hex-border, #d5d9de);
  background: #e8eaed;
  padding: 12px;
}
.wh-receipt-preview__doc.receipt-page {
  min-height: 0;
  max-width: 210mm;
  margin: 0 auto;
  padding: 14px 16px 18px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
}
.wh-receipt-preview .receipt-grid {
  font-size: 12px;
}
.wh-receipt-preview .receipt-items {
  font-size: 12px;
}
.wh-receipt-preview .receipt-logo {
  width: 52px;
  height: 52px;
}
.wh-receipt-preview .receipt-grid__brand {
  font-size: 15px;
}
.wh-receipt-preview .receipt-title {
  font-size: 18px;
  padding: 10px 0 12px;
}
.wh-receipt-preview .wh-receipt-detail__bar {
  padding: 0 4px 4px;
}
@media (max-width: 640px) {
  .wh-receipt-preview__scroll {
    padding: 8px;
    margin: 0 -2px;
  }
  .wh-receipt-preview__doc.receipt-page {
    min-width: 720px;
    padding: 12px 14px 16px;
  }
}
`;
}
function orderRow(o) {
  return `<tr class="hover:bg-secondary/30"><td class="px-4 py-3"><div class="flex flex-wrap items-center gap-2"><p class="font-medium">${esc(o.customerName)}</p>${receiptNo(o, "xs")}</div><p class="text-xs text-muted-foreground mt-0.5">${dte(o.createdAt)}</p></td><td class="px-4 py-3 text-sm">${o.employeeName || "-"}</td><td class="px-4 py-3 text-sm">${o.items.length} бараа</td><td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></td><td class="px-4 py-3 text-right text-sm font-semibold">${fmt(orderAmount(o))}</td><td class="px-4 py-3"><div class="flex justify-end gap-2 whitespace-nowrap"><button onclick="orderReceiptModal('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Баримт</button><button onclick="printOrderReceipt('${o.id}')" class="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Хэвлэх</button>${warehouseOrderStatusActions(o)}${canDeleteReceipt() ? `<button type="button" onclick="confirmDeleteReceipt('${esc(o.id)}')" class="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Устгах</button>` : ""}</div></td></tr>`;
}
function customerAvatarHtml(c, className = "customer-card__avatar") {
  const src = entityImageSrc(c?.image);
  if (src) {
    return `<img src="${esc(src)}" alt="" class="${className} customer-card__avatar-img" loading="lazy" decoding="async">`;
  }
  return `<span class="${className}" aria-hidden="true">${esc(deliveryInitial(c.name))}</span>`;
}
function customerImageField(c) {
  const preview = c.image || customerStoreImage(c);
  return `<div class="customer-image-field"><span class="block text-sm font-medium mb-2">Зураг</span><div class="customer-image-upload customer-image-upload--stack"><img id="customerImagePreview" src="${preview}" alt="" class="customer-image-upload__preview"><div class="customer-image-upload__body"><input id="customerImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/*" onchange="handleCustomerImage(this)" hidden><div class="customer-image-upload__actions"><button type="button" onclick="document.getElementById('customerImageFile').click()" class="btn btn--primary btn--sm customer-image-upload__pick">Зураг оруулах</button>${c.image ? `<button type="button" onclick="clearCustomerImage()" class="btn btn--secondary btn--sm">Зураг арилгах</button>` : ""}</div><input id="customerImageValue" name="image" type="hidden" value=""><p class="customer-image-upload__hint">Дэлгүүрийн зураг оруулна. JPG, PNG, WEBP.</p></div></div></div>`;
}
function initCustomerImageField(c) {
  const value = document.getElementById("customerImageValue"),
    preview = document.getElementById("customerImagePreview");
  const src = entityImageSrc(c?.image) || customerStoreImage(c);
  if (value) value.value = c?.image || "";
  if (preview) preview.src = src;
}
function compressImageFile(
  file,
  {
    maxSize = 960,
    quality = 0.82,
    maxBytes = MAX_INLINE_IMAGE_CHARS,
    background = null,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const scale = Math.min(1, maxSize / Math.max(width, height, 1));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas unavailable"));
          return;
        }
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > maxBytes && q > 0.45) {
          q -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        if (dataUrl.length > maxBytes) {
          reject(new Error("image too large"));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function compressProductImageFile(file) {
  return compressImageFile(file, { background: "#ffffff" });
}
function handleCustomerImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  customerImageCompressTask = compressImageFile(file)
    .then((dataUrl) => {
      const value = document.getElementById("customerImageValue"),
        preview = document.getElementById("customerImagePreview");
      if (value) value.value = dataUrl;
      if (preview) preview.src = dataUrl;
      const removeBtn = input
        .closest(".customer-image-upload__actions")
        ?.querySelector('[onclick="clearCustomerImage()"]');
      if (!removeBtn) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--secondary btn--sm";
        btn.textContent = "Зураг арилгах";
        btn.onclick = clearCustomerImage;
        input.closest(".customer-image-upload__actions")?.appendChild(btn);
      }
    })
    .catch((error) => {
      console.warn("Customer image compress failed", error);
      alert("Зураг уншиж чадсангүй");
    })
    .finally(() => {
      customerImageCompressTask = null;
    });
}
function clearCustomerImage() {
  const value = document.getElementById("customerImageValue"),
    preview = document.getElementById("customerImagePreview"),
    fileInput = document.getElementById("customerImageFile");
  if (value) value.value = "";
  if (fileInput) fileInput.value = "";
  if (preview) {
    const name = document.querySelector('[name="name"]')?.value || "Дэлгүүр";
    preview.src = customerStoreImage({ name });
  }
  document
    .querySelector(
      '.customer-image-upload__actions [onclick="clearCustomerImage()"]',
    )
    ?.remove();
}
function customerDetailIdIcon() {
  return `<svg class="ui-icon customer-detail__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h5M7 13h8"/></svg>`;
}
function customerDetailRow(label, valueHtml, iconHtml) {
  return `<div class="customer-detail__row">${iconHtml}<div class="customer-detail__row-body"><span class="customer-detail__label">${label}</span><div class="customer-detail__value">${valueHtml}</div></div></div>`;
}
function dialPhoneNumber(phone) {
  const n = String(phone || "").trim();
  if (!n) return;
  window.location.href = `tel:${encodeURIComponent(n)}`;
}
const CUSTOMER_PHONE_MAX = 8;
function customerPhonesList(c) {
  const seen = new Set();
  const out = [];
  const push = (value) => {
    const n = String(value || "").trim();
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  if (Array.isArray(c?.phones)) c.phones.forEach(push);
  push(c?.phone1);
  push(c?.phone2);
  return out;
}
function applyCustomerPhoneFields(target, phones) {
  const list = (phones || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, CUSTOMER_PHONE_MAX);
  const unique = [];
  const seen = new Set();
  for (const n of list) {
    if (seen.has(n)) continue;
    seen.add(n);
    unique.push(n);
  }
  target.phones = unique;
  target.phone1 = unique[0] || "";
  target.phone2 = unique[1] || "";
  return target;
}
function customerPhonesFromFormData(fd) {
  return (fd.getAll("phones") || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}
function customerPhoneFieldRow(value = "", index = 0, total = 1) {
  const canRemove = total > 1;
  return `<div class="customer-phone-row" data-customer-phone-row><label class="customer-phone-row__field"><span class="block text-sm font-medium mb-2">Утас ${index + 1}</span><input name="phones" type="tel" inputmode="tel" autocomplete="tel" value="${esc(value || "")}" placeholder="Утасны дугаар" class="w-full px-4 py-3 bg-secondary rounded app-input"></label>${canRemove ? `<button type="button" class="customer-phone-row__remove" onclick="removeCustomerPhoneField(this)" aria-label="Утас устгах" title="Устгах">×</button>` : ""}</div>`;
}
function customerPhonesFieldsHtml(c) {
  let phones = customerPhonesList(c);
  if (!phones.length) phones = [""];
  const addHidden = phones.length >= CUSTOMER_PHONE_MAX ? " hidden" : "";
  return `<div class="customer-phones" data-customer-phones><div class="customer-phones__list" id="customerPhonesList">${phones.map((p, i) => customerPhoneFieldRow(p, i, phones.length)).join("")}</div><button type="button" class="customer-phones__add"${addHidden} onclick="addCustomerPhoneField()">+ Утас нэмэх</button></div>`;
}
function renumberCustomerPhoneFields() {
  const list = document.getElementById("customerPhonesList");
  if (!list) return;
  const rows = [...list.querySelectorAll("[data-customer-phone-row]")];
  rows.forEach((row, i) => {
    const label = row.querySelector(".block");
    if (label) label.textContent = `Утас ${i + 1}`;
    let remove = row.querySelector(".customer-phone-row__remove");
    if (rows.length > 1) {
      if (!remove) {
        remove = document.createElement("button");
        remove.type = "button";
        remove.className = "customer-phone-row__remove";
        remove.setAttribute("aria-label", "Утас устгах");
        remove.title = "Устгах";
        remove.textContent = "×";
        remove.setAttribute("onclick", "removeCustomerPhoneField(this)");
        row.appendChild(remove);
      }
    } else if (remove) {
      remove.remove();
    }
  });
  const addBtn = document.querySelector(".customer-phones__add");
  if (addBtn) addBtn.hidden = rows.length >= CUSTOMER_PHONE_MAX;
}
function addCustomerPhoneField() {
  const list = document.getElementById("customerPhonesList");
  if (!list) return;
  const count = list.querySelectorAll("[data-customer-phone-row]").length;
  if (count >= CUSTOMER_PHONE_MAX) return;
  list.insertAdjacentHTML(
    "beforeend",
    customerPhoneFieldRow("", count, count + 1),
  );
  renumberCustomerPhoneFields();
  list.querySelector("[data-customer-phone-row]:last-child input")?.focus();
}
function removeCustomerPhoneField(btn) {
  const row = btn?.closest?.("[data-customer-phone-row]");
  const list = document.getElementById("customerPhonesList");
  if (!row || !list) return;
  if (list.querySelectorAll("[data-customer-phone-row]").length <= 1) return;
  row.remove();
  renumberCustomerPhoneFields();
}
function customerDetailPhonesHtml(c) {
  const phones = customerPhonesList(c);
  if (!phones.length) return `<span class="customer-detail__muted">—</span>`;
  return phones
    .map(
      (phone) =>
        `<button type="button" class="customer-detail__phone" data-phone="${esc(phone)}" onclick="dialPhoneNumber(this.getAttribute('data-phone'))">${esc(phone)}</button>`,
    )
    .join('<span class="customer-detail__sep" aria-hidden="true">·</span>');
}
function customerDetailHtml(c) {
  const addr = [c.province, c.district, c.khoroo, c.address]
      .filter(Boolean)
      .join(", "),
    link = mapsLink(c.latitude, c.longitude),
    rd = customerRegistrationDisplay(c);
  const rows = [
    customerDetailRow(
      "Регистр",
      rd ? esc(rd) : `<span class="customer-detail__muted">—</span>`,
      customerDetailIdIcon(),
    ),
    customerDetailRow(
      "Утас",
      customerDetailPhonesHtml(c),
      customerCardPhoneIcon(),
    ),
    customerDetailRow(
      "Хаяг",
      addr ? esc(addr) : `<span class="customer-detail__muted">—</span>`,
      customerCardPinIcon(),
    ),
    customerDetailRow(
      "Байршил",
      link
        ? `<a href="${link}" target="_blank" rel="noopener" class="customer-detail__maps">Google Maps дээр нээх</a>`
        : `<span class="customer-detail__muted">Бүртгэгдээгүй</span>`,
      customerCardPinIcon(),
    ),
  ].join("");
  return `<div class="customer-detail"><header class="customer-detail__hero">${customerAvatarHtml(c, "customer-detail__avatar")}<div class="customer-detail__hero-text">${c.companyName ? `<p class="customer-detail__company">${esc(c.companyName)}</p>` : ""}${rd ? `<span class="customer-detail__badge">РД ${esc(rd)}</span>` : ""}</div></header><div class="customer-detail__panel">${rows}${c.locationText ? `<p class="customer-detail__note">${esc(c.locationText)}</p>` : ""}</div></div>`;
}
function customerSubtitle(c) {
  const name = String(c.name || "").trim();
  const company = String(c.companyName || "").trim();
  const rd = customerRegistrationDisplay(c);
  const parts = [];
  if (rd) parts.push(`РД: ${rd}`);
  if (company && company !== name) parts.push(company);
  return parts.join(" · ");
}
const ACTION_VIEW_ICON = `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ACTION_EDIT_ICON = `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5z"/></svg>`;
const ACTION_DELETE_ICON = `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
function actionIconButton({ className, label, attrs = "", icon }) {
  return `<button type="button" ${attrs} class="${className}" aria-label="${esc(label)}" title="${esc(label)}">${icon}</button>`;
}
function viewIconButton({ className, attrs = "", label = "Харах" }) {
  return actionIconButton({
    className,
    label,
    attrs,
    icon: ACTION_VIEW_ICON,
  });
}
function editIconButton({ className, attrs = "", label = "Засах" }) {
  return actionIconButton({
    className,
    label,
    attrs,
    icon: ACTION_EDIT_ICON,
  });
}
function deleteIconButton({ className, attrs = "", label = "Устгах" }) {
  return actionIconButton({
    className,
    label,
    attrs,
    icon: ACTION_DELETE_ICON,
  });
}
function customerRegistrationDisplay(c) {
  return String(c?.registrationNumber || "").trim();
}
function customerRegistrationDigits(c) {
  return parseRegistrationNumber(c?.registrationNumber).digits;
}
const REGISTRATION_LABEL_RE = /^(?:р\.?\s*д\.?|rd|РД|Р\s*Д)\s*:?\s*/iu;
const REGISTRATION_PREFIX_RE = /^[A-Za-zА-ЯӨҮЁа-яөүё]{1,2}$/u;
const REGISTRATION_PREFIX_BEFORE_DIGITS_RE =
  /^([A-Za-zА-ЯӨҮЁа-яөүё]{1,2})(?=\d)/u;
const REGISTRATION_LOOKUP_MIN_DIGITS = 7;
function normalizeRegistrationInput(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}
function parseRegistrationNumber(value) {
  const raw = normalizeRegistrationInput(value);
  let cleaned = raw.replace(/\s+/g, "").replace(/-/g, "");
  cleaned = cleaned.replace(REGISTRATION_LABEL_RE, "");
  cleaned = cleaned.replace(
    /^[^A-Za-zА-ЯӨҮЁа-яөүё\d]+|[^A-Za-zА-ЯӨҮЁа-яөүё\d]+$/gu,
    "",
  );
  const digits = cleaned.replace(/\D/g, "");
  let prefix = "";
  const prefixMatch = cleaned.match(REGISTRATION_PREFIX_BEFORE_DIGITS_RE);
  if (prefixMatch) {
    prefix = prefixMatch[1].toUpperCase();
  } else if (REGISTRATION_PREFIX_RE.test(cleaned) && !digits) {
    prefix = cleaned.toUpperCase();
  }
  const full = prefix && digits ? `${prefix}${digits}` : digits || cleaned;
  const lookupKeys = [];
  if (digits) {
    lookupKeys.push(digits);
    const trimmed = digits.replace(/^0+/, "");
    if (trimmed && trimmed !== digits) lookupKeys.push(trimmed);
    const asNumber = String(Number(digits));
    if (asNumber && asNumber !== digits && asNumber !== "NaN")
      lookupKeys.push(asNumber);
  }
  if (prefix && digits) {
    lookupKeys.push(`${prefix}${digits}`, `${prefix.toLowerCase()}${digits}`);
  }
  if (cleaned && !lookupKeys.includes(cleaned)) lookupKeys.push(cleaned);
  const searchKey = digits
    ? digits.toLowerCase()
    : prefix
      ? prefix.toLowerCase()
      : full.toLowerCase();
  return {
    raw,
    cleaned,
    prefix,
    digits,
    full,
    searchKey,
    lookupKeys: [...new Set(lookupKeys.filter(Boolean))],
  };
}
function normalizeRegistrationNumber(value) {
  return parseRegistrationNumber(value).digits;
}
function registrationSearchKey(value) {
  return parseRegistrationNumber(value).searchKey;
}
function lookupLesRegistryCompany(index, value) {
  const parsed = parseRegistrationNumber(value);
  if (!parsed.digits) return "";
  for (const key of parsed.lookupKeys) {
    const hit = index[key];
    if (hit) return hit;
  }
  return "";
}
function findCustomerByRegistrationNumber(registrationNumber, excludeId = "") {
  const query = parseRegistrationNumber(registrationNumber);
  if (!query.digits && !query.searchKey) return null;
  return (
    state.customers.find((c) => {
      if (c.id === excludeId) return false;
      const stored = parseRegistrationNumber(c.registrationNumber);
      if (query.digits && stored.digits && query.digits === stored.digits)
        return true;
      if (
        query.full &&
        stored.full &&
        query.full.toLowerCase() === stored.full.toLowerCase()
      )
        return true;
      if (
        query.searchKey &&
        stored.searchKey &&
        query.searchKey === stored.searchKey
      )
        return true;
      return false;
    }) || null
  );
}
function customerMatchesQuery(c, q) {
  const parsedQ = parseRegistrationNumber(q);
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  const nameMatch = String(c.name || "")
    .toLowerCase()
    .includes(needle);
  const companyMatch = String(c.companyName || "")
    .toLowerCase()
    .includes(needle);
  const stored = parseRegistrationNumber(c.registrationNumber);
  const rdDigitsMatch =
    !!parsedQ.digits &&
    !!stored.digits &&
    (stored.digits.includes(parsedQ.digits) ||
      parsedQ.digits.includes(stored.digits));
  const rdFullMatch =
    !!parsedQ.full &&
    !!stored.full &&
    (stored.full.toLowerCase().includes(parsedQ.full.toLowerCase()) ||
      parsedQ.full.toLowerCase().includes(stored.full.toLowerCase()));
  const rdPrefixMatch =
    !!parsedQ.prefix &&
    !parsedQ.digits &&
    !!stored.prefix &&
    stored.prefix.toLowerCase() === parsedQ.prefix.toLowerCase();
  return (
    nameMatch ||
    companyMatch ||
    rdDigitsMatch ||
    rdFullMatch ||
    rdPrefixMatch ||
    customerPhonesList(c).some((phone) => phone.toLowerCase().includes(needle))
  );
}
function sortCustomersByName(customers) {
  return [...(customers || [])].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "mn"),
  );
}
function customerCardPhoneIcon() {
  return `<svg class="ui-icon customer-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}
function customerCardPinIcon() {
  return `<svg class="ui-icon customer-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
}
function customerCardPhonesHtml(c) {
  const phones = customerPhonesList(c);
  if (!phones.length) {
    return `<span class="customer-card__muted customer-card__phones">Утасгүй</span>`;
  }
  return `<div class="customer-card__phones">${phones
    .map(
      (phone) =>
        `<button type="button" class="customer-card__phone-link" data-phone="${esc(phone)}" onclick="dialPhoneNumber(this.getAttribute('data-phone'))" aria-label="Залгах ${esc(phone)}">${customerCardPhoneIcon()}<span>${esc(phone)}</span></button>`,
    )
    .join("")}</div>`;
}
function customerListHead() {
  return `<div class="customer-list__head" aria-hidden="true"><span>Харилцагч</span><span>Хаяг</span><span class="customer-list__head-actions">Үйлдэл</span></div>`;
}
function customerListRow(c, actionsHtml, active = false) {
  const addr = customerAddress(c);
  const sub = customerSubtitle(c);
  return `<article class="customer-card${active ? " customer-card--active" : ""}" data-customer-id="${esc(c.id)}"><header class="customer-card__head">${customerAvatarHtml(c)}<div class="customer-card__identity"><div class="customer-card__title-row"><h3 class="customer-card__name">${esc(c.name)}</h3>${customerCardPhonesHtml(c)}</div>${sub ? `<p class="customer-card__sub">${esc(sub)}</p>` : ""}</div></header><div class="customer-card__addr"><p class="customer-card__line" title="${esc(addr)}">${customerCardPinIcon()}<span>${esc(addr)}</span></p></div><footer class="customer-card__actions">${actionsHtml}</footer></article>`;
}
function focusSavedCustomer(customerId, customerName) {
  if (!customerId) return;
  state.currentView = "customers";
  state.searches.customers = "";
  state.customerHighlightId = customerId;
  render();
  showAppToast(`${customerName} хадгалагдлаа`, "success");
  const scrollToSaved = () => {
    const card = document.querySelector(`[data-customer-id="${customerId}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  requestAnimationFrame(() => requestAnimationFrame(scrollToSaved));
  setTimeout(scrollToSaved, 280);
  setTimeout(() => {
    if (state.customerHighlightId !== customerId) return;
    state.customerHighlightId = "";
    if (state.currentView === "customers") render();
  }, 5000);
}
function customersView() {
  const q = state.searches.customers || "";
  let rows = sortCustomersByName(
    state.customers.filter((c) => customerMatchesQuery(c, q)),
  );
  const highlightId = state.customerHighlightId || "";
  if (highlightId) {
    const hi = rows.findIndex((c) => c.id === highlightId);
    if (hi > 0) {
      const [hit] = rows.splice(hi, 1);
      rows = [hit, ...rows];
    }
  }
  const excelBtn = canExportExcel()
      ? excelDownloadBtn("confirmCustomerExcel()", {
          label: "Харилцагчийн мэдээлэл татах",
          shortLabel: "Мэдээлэл татах",
        })
      : "",
    addBtn =
      hasPermission("customers.create") ||
      hasPermission("customerAdd.create") ||
      hasPermission("customerAdd.view")
        ? pageActionAddBtn("Харилцагч нэмэх", "customerModal()", "customer")
        : "";
  return `<div class="space-y-4">${pageHead("Харилцагч")}<div class="list-panel list-panel--customers">${listActionToolbarHtml({ search: pageToolbarSearch({ focusKey: "customers", value: q, placeholder: "Нэр, РД-ээр хайх..." }), excelBtn, addBtn, importKind: "customers" })}<div class="list-panel__table">${customerListHead()}<div class="list-panel__body customer-list">${rows.length ? rows.map(customerRow).join("") : `<div class="list-panel__empty">Харилцагч олдсонгүй</div>`}</div></div></div></div>`;
}
function confirmDataExport(title, onConfirm, message = "Мэдээлэл татах уу?") {
  confirmModal(title, message, {
    confirmLabel: "Татах",
    onConfirm,
  });
}
function confirmPrintExport(title, onConfirm) {
  confirmModal(title, "Баримт хэвлэх үү?", {
    confirmLabel: "Хэвлэх",
    onConfirm,
  });
}
function orderReceiptSearchText(o) {
  const customer = state.customers.find((x) => x.id === o.customerId) || {};
  return [
    o.id,
    formatReceiptNumber(o),
    o.customerName,
    customer.name,
    customer.companyName,
    customer.registrationNumber,
    customer.phone1,
    customer.phone2,
    ...customerPhonesList(customer),
    o.employeeName,
    o.employeePhone,
    paymentTermLabel(o.paymentTerm),
    o.status,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}
function orderReceiptMatchesQuery(o, q) {
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  return orderReceiptSearchText(o).includes(needle);
}
function idList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}
function receiptWorkerIds() {
  return idList(state.searches.receiptWorkerIds);
}
function receiptDeliveryIds() {
  return idList(state.searches.receiptDeliveryIds);
}
function receiptPrintWorkerIds() {
  return idList(state.receiptPrintWorkerIds);
}
function receiptSalesEmployees() {
  return salesOrderAgents();
}
function receiptPrintWorkerRoleLabel(role) {
  return role === "admin" ? "Админ" : "ХТ";
}
function receiptPrintWorkerSummary(selected = receiptPrintWorkerIds()) {
  if (!selected.length) return "Сонгох";
  if (selected.length === 1) {
    const emp = state.employees.find((e) => e.id === selected[0]);
    return emp?.name || "1 сонгосон";
  }
  return `${selected.length} сонгосон`;
}
function receiptPrintWorkerSyncToken() {
  return receiptPrintWorkerIds().slice().sort().join("|");
}
function receiptFilterOptions() {
  const workerIds = receiptPrintWorkerIds();
  return {
    workerIds: workerIds.length ? workerIds : receiptWorkerIds(),
    deliveryIds: receiptPrintDeliveryIds(),
  };
}
function receiptPrintDeliveryIds() {
  const id = state.receiptPrintDeliveryId || "";
  return id ? [id] : receiptDeliveryIds();
}
function receiptPrintWorkerOrders(workerIds = receiptPrintWorkerIds()) {
  const ids = new Set(workerIds);
  if (!ids.size) return [];
  const rows = filterWarehouseOrders(
    state.orders.filter(
      (o) =>
        ids.has(o.employeeId) &&
        (state.filters.order === "all" || o.status === state.filters.order),
    ),
  );
  return sortOrdersBySelectedPeople(rows, workerIds);
}
function syncReceiptPrintSelection(orders) {
  const workerIds = receiptPrintWorkerIds();
  if (!workerIds.length) {
    state.receiptPrintOrderIds = [];
    state.receiptPrintWorkerSyncKey = "";
    return;
  }
  const key = receiptPrintWorkerSyncToken();
  if (state.receiptPrintWorkerSyncKey !== key) {
    state.receiptPrintWorkerSyncKey = key;
    // Default: nothing checked — user picks what to print/export.
    state.receiptPrintOrderIds = [];
    return;
  }
  const valid = new Set(orders.map((o) => o.id));
  state.receiptPrintOrderIds = idList(state.receiptPrintOrderIds).filter((id) =>
    valid.has(id),
  );
}
function receiptPrintWorkerSelectHtml() {
  const people = receiptSalesEmployees(),
    selected = receiptPrintWorkerIds(),
    open = !!state.receiptPrintWorkerPickerOpen,
    summary = receiptPrintWorkerSummary(selected),
    triggerAttrs = whReceiptPickerTriggerAttrs();
  return `<div class="wh-receipt-field wh-receipt-field--picker"><span class="wh-receipt-field__label">Худалдааны төлөөлөгч</span><div class="wh-receipt-picker${open ? " is-open" : ""}" data-receipt-worker-picker><button type="button" class="wh-receipt-picker__trigger"${triggerAttrs} onclick="toggleReceiptPrintWorkerPicker(event)" aria-expanded="${open ? "true" : "false"}" aria-haspopup="listbox"><span class="wh-receipt-picker__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></span><span class="wh-receipt-picker__value${selected.length ? "" : " is-placeholder"}">${esc(summary)}</span><svg class="wh-receipt-picker__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>${open ? `<div class="wh-receipt-picker__panel" role="listbox" aria-label="Худалдааны төлөөлөгч" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onpointerdown="armWhReceiptPickerDismissGuard()"><div class="wh-receipt-picker__head"><span class="wh-receipt-picker__head-title">Сонгох</span>${selected.length ? `<button type="button" class="wh-receipt-picker__clear" onclick="clearReceiptPrintWorkers(event)">Цэвэрлэх</button>` : ""}</div><div class="wh-receipt-picker__list">${people.length ? people.map((e) => `<label class="wh-receipt-picker__item${selected.includes(e.id) ? " is-active" : ""}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox"${selected.includes(e.id) ? " checked" : ""} onmousedown="event.preventDefault()" onchange="toggleReceiptPrintWorker('${esc(e.id)}', event)"><span class="wh-receipt-picker__avatar-wrap">${employeeAvatarHtml(e, "wh-receipt-picker__avatar")}</span><span class="wh-receipt-picker__meta"><span class="wh-receipt-picker__name">${esc(e.name)}</span><span class="wh-receipt-picker__role wh-receipt-picker__role--${esc(e.role)}">${receiptPrintWorkerRoleLabel(e.role)}</span></span></label>`).join("") : `<p class="wh-receipt-picker__empty">Ажилтан олдсонгүй</p>`}</div><div class="wh-receipt-picker__foot"><button type="button" class="btn btn--primary btn--sm btn--block" onclick="closeReceiptPrintWorkerPicker(event)">Болсон</button></div></div>` : ""}</div></div>`;
}
function receiptPrintDeliverySummary(
  deliveryId = state.receiptPrintDeliveryId || "",
) {
  if (!deliveryId) return "Бүгд";
  const emp = state.employees.find((e) => e.id === deliveryId);
  return emp?.name || "Бүгд";
}
function receiptPrintDeliverySelectHtml() {
  const deliveries = deliveryEmployees(),
    deliveryId = state.receiptPrintDeliveryId || "",
    open = !!state.receiptPrintDeliveryPickerOpen,
    summary = receiptPrintDeliverySummary(deliveryId),
    triggerAttrs = whReceiptPickerTriggerAttrs();
  return `<div class="wh-receipt-field wh-receipt-field--picker"><span class="wh-receipt-field__label">Түгээгч</span><div class="wh-receipt-picker${open ? " is-open" : ""}" data-receipt-delivery-picker><button type="button" class="wh-receipt-picker__trigger"${triggerAttrs} onclick="toggleReceiptPrintDeliveryPicker(event)" aria-expanded="${open ? "true" : "false"}" aria-haspopup="listbox"><span class="wh-receipt-picker__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 4v5h-7v-9z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></svg></span><span class="wh-receipt-picker__value${deliveryId ? "" : " is-placeholder"}">${esc(summary)}</span><svg class="wh-receipt-picker__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>${open ? `<div class="wh-receipt-picker__panel" role="listbox" aria-label="Түгээгч" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onpointerdown="armWhReceiptPickerDismissGuard()"><div class="wh-receipt-picker__head"><span class="wh-receipt-picker__head-title">Сонгох</span>${deliveryId ? `<button type="button" class="wh-receipt-picker__clear" onclick="clearReceiptPrintDelivery(event)">Цэвэрлэх</button>` : ""}</div><div class="wh-receipt-picker__list">${deliveries.length ? deliveries.map((e) => `<label class="wh-receipt-picker__item${deliveryId === e.id ? " is-active" : ""}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox"${deliveryId === e.id ? " checked" : ""} onmousedown="event.preventDefault()" onchange="toggleReceiptPrintDelivery('${esc(e.id)}', event)"><span class="wh-receipt-picker__avatar-wrap">${employeeAvatarHtml(e, "wh-receipt-picker__avatar")}</span><span class="wh-receipt-picker__meta"><span class="wh-receipt-picker__name">${esc(e.name)}</span><span class="wh-receipt-picker__role">${esc(e.phone || "Утасгүй")}</span></span></label>`).join("") : `<p class="wh-receipt-picker__empty">Түгээгч олдсонгүй</p>`}</div><div class="wh-receipt-picker__foot"><button type="button" class="btn btn--primary btn--sm btn--block" onclick="closeReceiptPrintDeliveryPicker(event)">Болсон</button></div></div>` : ""}</div></div>`;
}
let receiptPrintWorkerPickerDismissBound = false;
function toggleReceiptPrintWorkerPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintDeliveryPickerOpen = false;
  state.receiptPrintWorkerPickerOpen = !state.receiptPrintWorkerPickerOpen;
  if (state.receiptPrintWorkerPickerOpen) suppressWhReceiptPickerDismiss();
  render();
}
function closeReceiptPrintWorkerPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerPickerOpen = false;
  render();
}
function toggleReceiptPrintDeliveryPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerPickerOpen = false;
  state.receiptPrintDeliveryPickerOpen = !state.receiptPrintDeliveryPickerOpen;
  if (state.receiptPrintDeliveryPickerOpen) suppressWhReceiptPickerDismiss();
  render();
}
function closeReceiptPrintDeliveryPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintDeliveryPickerOpen = false;
  render();
}
function toggleReceiptPrintWorker(id, ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  const current = receiptPrintWorkerIds();
  state.receiptPrintWorkerIds = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  state.receiptPrintWorkerSyncKey = "";
  state.receiptPrintWorkerPickerOpen = true;
  render();
}
function clearReceiptPrintWorkers(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerIds = [];
  state.receiptPrintWorkerSyncKey = "";
  state.receiptPrintOrderIds = [];
  state.receiptPrintWorkerPickerOpen = true;
  render();
}
function setReceiptPrintDelivery(id) {
  const next = id || "";
  if (state.receiptPrintDeliveryId === next) return;
  state.receiptPrintDeliveryId = next;
  state.receiptPrintWorkerSyncKey = "";
  render();
}
function toggleReceiptPrintDelivery(id, ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  const current = state.receiptPrintDeliveryId || "";
  state.receiptPrintDeliveryId = current === id ? "" : id;
  state.receiptPrintWorkerSyncKey = "";
  state.receiptPrintDeliveryPickerOpen = true;
  render();
}
function clearReceiptPrintDelivery(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintDeliveryId = "";
  state.receiptPrintWorkerSyncKey = "";
  state.receiptPrintDeliveryPickerOpen = true;
  render();
}
function bindReceiptPrintWorkerPickerDismiss() {
  if (receiptPrintWorkerPickerDismissBound) return;
  receiptPrintWorkerPickerDismissBound = true;
  document.addEventListener("click", (ev) => {
    if (whReceiptPickerDismissGuard) return;
    if (shouldSuppressWhReceiptPickerDismiss()) return;
    if (!isWhReceiptPickerOpen()) return;
    const target = ev.target;
    if (
      target.closest?.("[data-receipt-worker-picker]") ||
      target.closest?.("[data-receipt-delivery-picker]") ||
      target.closest?.("[data-permission-employee-picker]")
    ) {
      return;
    }
    closeReceiptPrintPickersState();
    if (target.closest?.(".wh-date-filters")) {
      closeReceiptPrintPickersVisual();
      return;
    }
    render();
  });
}
function toggleReceiptPrintOrder(id) {
  const current = idList(state.receiptPrintOrderIds);
  state.receiptPrintOrderIds = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  render();
}
function orderDeliveryEmployeeId(o = {}) {
  if (o.deliveryEmployeeId) return String(o.deliveryEmployeeId);
  const name = String(o.deliveryName || "")
    .trim()
    .toLowerCase();
  if (!name) return "";
  return (
    deliveryEmployees().find(
      (e) =>
        String(e.name || "")
          .trim()
          .toLowerCase() === name,
    )?.id || ""
  );
}
function compareOrdersNewestFirst(a, b) {
  const seqA = Number(a?.receiptSeq) || 0;
  const seqB = Number(b?.receiptSeq) || 0;
  if (seqB !== seqA) return seqB - seqA;
  const at = new Date(a?.createdAt || 0).getTime();
  const bt = new Date(b?.createdAt || 0).getTime();
  if (Number.isFinite(bt) && Number.isFinite(at) && bt !== at) return bt - at;
  return String(b?.id || "").localeCompare(String(a?.id || ""), "mn");
}
function sortOrdersBySelectedPeople(orders, workerIds = [], deliveryIds = []) {
  const workerRank = new Map(workerIds.map((id, idx) => [id, idx]));
  const deliveryRank = new Map(deliveryIds.map((id, idx) => [id, idx]));
  return [...orders].sort((a, b) => {
    if (workerRank.size) {
      const ar = workerRank.has(a.employeeId)
          ? workerRank.get(a.employeeId)
          : Number.MAX_SAFE_INTEGER,
        br = workerRank.has(b.employeeId)
          ? workerRank.get(b.employeeId)
          : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
    }
    if (deliveryRank.size) {
      const ad = orderDeliveryEmployeeId(a),
        bd = orderDeliveryEmployeeId(b),
        ar = deliveryRank.has(ad)
          ? deliveryRank.get(ad)
          : Number.MAX_SAFE_INTEGER,
        br = deliveryRank.has(bd)
          ? deliveryRank.get(bd)
          : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
    }
    return compareOrdersNewestFirst(a, b);
  });
}
function canPickWarehouseWorkers() {
  const role = state.currentEmployee?.role;
  return role === "admin" || role === "warehouse";
}
function warehouseScopeWorkerIds() {
  const emp = state.currentEmployee;
  if (!emp) return [];
  if (emp.role === "sales") return [emp.id];
  return idList(state.selectedWorkers);
}
function warehouseOrdersForSelectedWorkers() {
  const scopeIds = warehouseScopeWorkerIds();
  if (!scopeIds.length) return [];
  const idSet = new Set(scopeIds);
  const orders = filterWarehouseOrders(
    state.orders.filter((o) => idSet.has(o.employeeId)),
  );
  return sortOrdersBySelectedPeople(orders, scopeIds);
}
function warehouseActiveWorkerIds(orders) {
  const hasOrder = new Set((orders || []).map((o) => o.employeeId));
  return warehouseScopeWorkerIds().filter((id) => hasOrder.has(id));
}
function warehouseDateDisplayText(day = state.filters.warehouseDate || "") {
  const iso = normalizeIsoDateInput(day) || todayIso();
  return iso.replace(/-/g, ".");
}
function ensureWarehouseDateDefault() {
  if (!normalizeIsoDateInput(state.filters.warehouseDate)) {
    state.filters.warehouseDate = todayIso();
  }
}
function warehouseDateFiltersHtml() {
  ensureWarehouseDateDefault();
  const today = todayIso(),
    day = normalizeIsoDateInput(state.filters.warehouseDate) || today,
    isToday = day === today,
    display = warehouseDateDisplayText(day);
  return `<div class="wh-date-filters"><button type="button" onclick="selectWarehouseToday()" class="wh-date-filters__live${isToday ? " is-active" : ""}">Өнөөдөр</button><label class="wh-date-filters__date app-input"><span class="wh-date-filters__date-value">${esc(display)}</span><svg class="wh-date-filters__date-icon ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v2M17 3v2M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg><input type="date" class="wh-date-filters__native app-input" value="${esc(day)}" onchange="setWarehouseDate(this.value)" onfocus="warehouseDateFocus()" onblur="warehouseDateBlur()" aria-label="Огноо сонгох"></label><span class="wh-date-filters__hint">${isToday ? "Өнөөдрийн захиалга" : "Сонгосон өдрийн захиалга"}</span></div>`;
}
function selectWarehouseToday() {
  state.filters.warehouseDate = todayIso();
  state.selectedWarehouseOrderId = "";
  render();
}
function clearWarehouseDate() {
  selectWarehouseToday();
}
function setWarehouseDate(day) {
  state.filters.warehouseDate = normalizeIsoDateInput(day) || todayIso();
  state.selectedWarehouseOrderId = "";
  render();
}
function receiptFilterToggle(kind, id) {
  const key = kind === "delivery" ? "receiptDeliveryIds" : "receiptWorkerIds";
  const current = idList(state.searches[key]);
  state.searches[key] = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  state.selectedWarehouseOrderId = "";
  render();
}
function receiptFilterClear(kind = "") {
  if (!kind || kind === "worker") state.searches.receiptWorkerIds = [];
  if (!kind || kind === "delivery") state.searches.receiptDeliveryIds = [];
  state.selectedWarehouseOrderId = "";
  render();
}
function receiptFilterChip(kind, item, selectedIds) {
  const active = selectedIds.includes(item.id);
  return `<button type="button" onclick="receiptFilterToggle(${jsStringArg(kind)},${jsStringArg(item.id)})" class="receipt-filter-chip${active ? " is-active" : ""}" aria-pressed="${active ? "true" : "false"}">${esc(item.name)}</button>`;
}
function receiptFilterGroup(kind, title, items, selectedIds) {
  if (!items.length) return "";
  const clear =
    selectedIds.length > 0
      ? `<button type="button" onclick="receiptFilterClear(${jsStringArg(kind)})" class="receipt-filter-clear">Цэвэрлэх</button>`
      : "";
  return `<div class="receipt-filter-group"><div class="receipt-filter-group__head"><span>${esc(title)}</span>${clear}</div><div class="receipt-filter-chips">${items.map((item) => receiptFilterChip(kind, item, selectedIds)).join("")}</div></div>`;
}
function receiptPeopleFiltersHtml() {
  const deliveries = deliveryEmployees(),
    deliveryIds = receiptDeliveryIds(),
    clearAll = deliveryIds.length
      ? `<button type="button" onclick="receiptFilterClear('delivery')" class="receipt-filter-clear receipt-filter-clear--all">Бүгдийг цэвэрлэх</button>`
      : "";
  return `<div class="receipt-people-filters">${clearAll}${receiptFilterGroup("delivery", "Түгээгч", deliveries, deliveryIds)}</div>`;
}
function confirmCustomerExcel() {
  if (!canExportExcel()) return;
  if (!state.customers.length) return alert("Харилцагч байхгүй");
  confirmDataExport("Мэдээлэл татах", customerExcel);
}
function confirmProductsExport() {
  if (!canExportExcel()) return alertModal("Эрхгүй", "Мэдээлэл татах эрхгүй.");
  if (!productsExportList().length) return alert("Бараа байхгүй");
  confirmDataExport("Мэдээлэл татах", exportProductsExcel);
}
function productsExportList() {
  const q = state.searches.products || "",
    cat = state.filters.category;
  return state.products
    .filter(
      (p) =>
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          String(p.barcode || "").includes(q)) &&
        (cat === "all" || p.category === cat),
    )
    .sort(
      (a, b) =>
        String(a.category || "").localeCompare(
          String(b.category || ""),
          "mn",
        ) || String(a.name || "").localeCompare(String(b.name || ""), "mn"),
    );
}
function productExcelHeaders() {
  const headers = ["№", "Баркод", "Барааны нэр", "Төрөл", "Борлуулалтын үнэ"];
  if (canViewProductCost()) headers.push("Өртөг үнэ");
  headers.push("Үлдэгдэл", "Нэгж");
  return headers;
}
function productExcelDataRows(products = productsExportList()) {
  return products.map((p, i) => {
    const row = [
      i + 1,
      p.barcode || "-",
      p.name || "",
      p.category || "",
      Number(p.price) || 0,
    ];
    if (canViewProductCost()) row.push(productCostPrice(p));
    row.push(Number(p.stock) || 0, p.unit || "ширхэг");
    return row;
  });
}
function productSheetDateLabel() {
  const d = new Date();
  return `Огноо: ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function productSheetProductsGrouped(products = productsExportList()) {
  const groups = [];
  let cur = "";
  let index = 0;
  for (const p of products) {
    const cat = p.category || "Бусад";
    if (cat !== cur) {
      groups.push({ type: "cat", name: cat });
      cur = cat;
    }
    index += 1;
    groups.push({ type: "product", product: p, index });
  }
  return groups;
}
function exportProductsExcel() {
  exportProductsExcelXlsx().catch(() => exportProductsExcelFallback());
}
function exportProductsExcelFallback() {
  const products = productsExportList();
  if (!products.length) return alert("Бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  excel(`baraa-${stamp}.xlsx`, [
    ["Барааны жагсаалт"],
    [`${productSheetDateLabel()} · Нийт: ${products.length} бараа`],
    [],
    productExcelHeaders(),
    ...productExcelDataRows(products),
  ]);
}
function confirmInventoryExport() {
  if (!canExportExcel()) return alertModal("Эрхгүй", "Мэдээлэл татах эрхгүй.");
  confirmDataExport("Мэдээлэл татах", () => {
    excel(
      "inventory.xlsx",
      state.inventoryLogs.map((l) => [
        dte(l.date),
        l.productName,
        l.type,
        l.quantity,
        l.employeeName,
      ]),
    );
  });
}
function confirmReportExport() {
  if (!canExportExcel()) return alertModal("Эрхгүй", "Мэдээлэл татах эрхгүй.");
  confirmDataExport("Мэдээлэл татах", () => {
    const orders = reportOrdersFiltered(),
      total = orders.reduce((s, o) => s + orderAmount(o), 0),
      paid = orders
        .filter((o) => orderIsPaid(o))
        .reduce((s, o) => s + orderAmount(o), 0);
    excel("report.xlsx", [
      ["Нийт", "Төлсөн"],
      [total, paid],
    ]);
  });
}
function confirmEmployeeExcel() {
  if (!canExportExcel()) return alertModal("Эрхгүй", "Мэдээлэл татах эрхгүй.");
  if (canPickWarehouseWorkers() && !state.selectedWorkers.length)
    return alert("Ажилтан сонгоно уу");
  if (!warehouseScopeWorkerIds().length) return alert("Ажилтан сонгоно уу");
  confirmDataExport("Мэдээлэл татах", employeeExcel);
}
function customerExcel() {
  if (!canExportExcel()) return;
  if (!state.customers.length) return alert("Харилцагч байхгүй");
  const sorted = [...state.customers].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "mn"),
  );
  const phoneCount = Math.max(
    2,
    ...sorted.map((c) => customerPhonesList(c).length),
  );
  const phoneHeaders = Array.from(
    { length: phoneCount },
    (_, i) => `Утас ${i + 1}`,
  );
  const rows = [
    [
      "№",
      "Нэр",
      "РД",
      "Байгууллагын нэр",
      ...phoneHeaders,
      "Аймаг/Хот",
      "Дүүрэг/Сум",
      "Хороо",
      "Дэлгэрэнгүй хаяг",
      "Уртраг",
      "Өргөрөг",
    ],
    ...sorted.map((c, i) => {
      const phones = customerPhonesList(c);
      return [
        i + 1,
        c.name || "",
        c.registrationNumber || "",
        c.companyName || "",
        ...Array.from({ length: phoneCount }, (_, n) => phones[n] || ""),
        c.province || "",
        c.district || "",
        c.khoroo || "",
        c.address || "",
        c.latitude ?? "",
        c.longitude ?? "",
      ];
    }),
  ];
  excel("hariltsagch.xlsx", rows);
}
function customerAddress(c) {
  return (
    [c.province, c.district, c.khoroo, c.address].filter(Boolean).join(", ") ||
    "-"
  );
}
function customerRow(c) {
  const id = esc(c.id);
  const deleteBtn = canDelete()
    ? deleteIconButton({
        className: "customer-card__icon-btn",
        attrs: `data-confirm-delete="customer" data-id="${id}"`,
        label: "Харилцагч устгах",
      })
    : "";
  return customerListRow(
    c,
    `${viewIconButton({ className: "customer-card__icon-btn", attrs: `onclick="customerDetail('${id}')"`, label: "Харах" })}${editIconButton({ className: "customer-card__icon-btn", attrs: `onclick="confirmEditCustomer('${id}')"`, label: "Харилцагч засах" })}${deleteBtn}`,
    state.customerHighlightId === c.id,
  );
}
function workerPickCard(c) {
  const active = state.workerCustomer === c.id;
  const sub = customerSubtitle(c);
  const phone = customerPhonesList(c)[0] || "";
  const reg = customerRegistrationDisplay(c);
  const id = esc(c.id);
  const line2 = sub || reg || phone;
  return `<button type="button" class="worker-pick-card${active ? " is-selected" : ""}" onclick="pickWorkerStore('${id}')" aria-pressed="${active ? "true" : "false"}">${customerAvatarHtml(c, "worker-pick-card__avatar")}<span class="worker-pick-card__text"><span class="worker-pick-card__name">${esc(c.name)}</span>${line2 ? `<span class="worker-pick-card__sub">${esc(line2)}</span>` : ""}</span>${active ? `<span class="worker-pick-card__check" aria-hidden="true">✓</span>` : ""}</button>`;
}
function productsView() {
  const q = state.searches.products || "",
    cat = state.filters.category,
    list = state.products.filter(
      (p) =>
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.barcode.includes(q)) &&
        (cat === "all" || p.category === cat),
    ),
    low = lowStockProducts().length;
  const toolbarFilters = `${pageToolbarSearch({ focusKey: "products", value: q, placeholder: "Хайх..." })}<select onchange="setProductCategory(this.value)"${pageToolbarSelectHandlers()} class="page-toolbar__select app-input"><option value="all">Бүх төрөл</option>${cats()
    .map((c) => `<option ${cat === c ? "selected" : ""}>${c}</option>`)
    .join("")}</select>`;
  const toolbarActions = [
    canExportExcel() ? excelDownloadBtn("confirmProductsExport()") : "",
    canManageProductCategories()
      ? pageToolbarSecondaryBtn("Төрөл", "categoryModal()")
      : "",
    canManageProducts()
      ? pageToolbarPrimaryBtn(
          "+ Бараа нэмэх",
          "productModal()",
          "btn--toolbar-add-product",
        )
      : "",
  ]
    .filter(Boolean)
    .join("");
  const productListClass = `product-list${canManageProducts() ? "" : " product-list--readonly"}${canViewProductCost() ? " product-list--show-cost" : ""}`;
  return `<div class="space-y-4">${pageHead("Бараа")}${metricsBar(`${card("Бараа", state.products.length)}${card("Төрөл", cats().length)}${card("Үлд", low, low ? "text-tone-warning" : "text-tone-success")}`, 3)}<div class="line-panel">${pageToolbarHtml({ filters: toolbarFilters, actions: toolbarActions })}${excelImportToolbar("products")}<div class="${productListClass}">${list.length ? `${productListHead()}${list.map(productCard).join("")}` : `<div class="line-panel__empty">Бараа олдсонгүй</div>`}</div></div></div>`;
}
function productListHead() {
  const actions = canManageProducts(),
    showCost = canViewProductCost();
  return actions
    ? `<span class="product-list__col product-list__col--actions">Үйлдэл</span>`
    : "";
}
function productDetailRow(label, valueHtml) {
  return `<div class="customer-detail__row"><div class="customer-detail__row-body"><span class="customer-detail__label">${label}</span><div class="customer-detail__value">${valueHtml}</div></div></div>`;
}
function productDetailHtml(p, id) {
  const packSize = productPackSize(p),
    stock = p.stock ?? 0,
    unit = esc(p.unit || "ш"),
    stockValue = isLowStock(p)
      ? `<span class="product-detail__warn">${stock} ${unit} · бага үлдэгдэл</span>`
      : `${stock} ${unit}`,
    rows = [
      productDetailRow(
        "Баркод",
        p.barcode
          ? `<span class="product-detail__mono">${esc(p.barcode)}</span>`
          : `<span class="customer-detail__muted">—</span>`,
      ),
      productDetailRow("Төрөл", esc(p.category || "—")),
      productDetailRow("Хэмжих нэгж", esc(p.unit || "—")),
      productDetailRow("Борлуулалтын үнэ", esc(fmt(p.price))),
      productDetailRow("Үлдэгдэл", stockValue),
    ];
  if (packSize) {
    rows.push(productDetailRow("Багц", `${packSize} ш/багц`));
  }
  if (canViewProductCost()) {
    const cost = productCostPrice(p);
    rows.push(
      productDetailRow(
        "Өртөг үнэ",
        cost ? esc(fmt(cost)) : `<span class="customer-detail__muted">—</span>`,
      ),
    );
  }
  if (p.country) {
    rows.push(productDetailRow("Үйлдвэрлэсэн улс", esc(p.country)));
  }
  const minStock = stockAlertLevel(p);
  if (minStock > 0) {
    rows.push(productDetailRow("Анхааруулах үлдэгдэл", `${minStock} ${unit}`));
  }
  const editBtn = canManageProducts()
    ? `<footer class="customer-detail__actions">${editIconButton({ className: "btn btn--primary btn--block btn--icon-label", attrs: `onclick="confirmEditProduct('${esc(id)}')"`, label: "Бараа засах" })}</footer>`
    : "";
  return `<div class="customer-detail product-detail"><header class="customer-detail__hero"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="${esc(p.name)}" class="customer-detail__avatar product-detail__img"><div class="customer-detail__hero-text"><p class="customer-detail__company">${esc(p.name)}</p>${p.category ? `<span class="customer-detail__badge">${esc(p.category)}</span>` : ""}</div></header><div class="customer-detail__panel">${rows.join("")}</div>${editBtn}</div>`;
}
function productDetail(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  box(p.name, productDetailHtml(p, id), "max-w-xl");
}
function productCard(p) {
  const catLine = [p.category, p.country].filter(Boolean).join(" · ") || "—";
  const adminActions = canManageProducts()
    ? `<div class="product-card__actions" onclick="event.stopPropagation()">${editIconButton({ className: "product-card__action-btn product-card__action-btn--edit", attrs: `onclick="confirmEditProduct('${esc(p.id)}')"`, label: "Бараа засах" })}${deleteIconButton({ className: "product-card__action-btn product-card__action-btn--delete", attrs: `data-confirm-delete="product" data-id="${esc(p.id)}"`, label: "Бараа устгах" })}</div>`
    : "";
  const costCell = canViewProductCost()
    ? `<span class="product-card__cost" title="Өртөг үнэ">${productCostPrice(p) ? fmt(productCostPrice(p)) : "—"}</span>`
    : "";
  const low = isLowStock(p);
  const stock = p.stock ?? 0;
  return `<article class="product-card product-card--clickable" role="button" tabindex="0" onclick="productDetail('${esc(p.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();productDetail('${esc(p.id)}')}"><div class="product-card__name"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" ${productImgDataAttrs(p)} class="product-card__img" loading="lazy" decoding="async" alt=""><div class="product-card__copy"><p class="product-card__title">${esc(p.name)}</p><p class="product-card__hint"><span class="product-card__hint-cat">${esc(catLine)}</span><span class="product-card__hint-sep" aria-hidden="true">·</span><span class="product-card__hint-code">${esc(p.barcode || "—")}</span></p></div></div><p class="product-card__cat">${esc(catLine)}</p><div class="product-card__facts">${costCell}<span class="product-card__price">${fmt(p.price)}</span><span class="product-card__stock${low ? " is-low" : ""}" title="Үлдэгдэл">Үлд ${stock}</span></div><span class="product-card__barcode">${esc(p.barcode || "—")}</span>${adminActions}</article>`;
}
function inventoryView() {
  const tab = state.filters.inventory,
    cat = state.filters.inventoryCategory,
    q = state.searches.inventory || "",
    list = state.products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.barcode.includes(q)),
    );
  return `<div class="space-y-4">${pageHead("Нярав")}<div class="seg-tabs seg-tabs--3">${[
    ["stock", "Үлдэгдэл"],
    ["in", "Орлого авах"],
    ["out", "Зарлага гаргах"],
  ]
    .map(
      (t) =>
        `<button type="button" onclick="setInventoryTab('${t[0]}')" class="seg-tab ${tab === t[0] ? "is-active" : ""}">${t[1]}</button>`,
    )
    .join(
      "",
    )}</div><div class="bg-card rounded p-3 space-y-3">${pageToolbarHtml({ filters: pageToolbarSearch({ focusKey: "inventory", value: q, placeholder: "Хайх..." }), actions: tab === "in" || tab === "out" ? "" : excelDownloadBtn("confirmInventoryExport()") })}${categoryFilterChipsHtml({ active: cat, allLabel: "Бүх төрөл", handler: "setInventoryCategory" })}</div>${tab === "stock" ? stockGrid(list) : tab === "in" ? stockInPanel(list) : stockOutPanel(list)}</div>`;
}
function inventoryEmployees() {
  return state.employees
    .filter((e) => e.role === "warehouse")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "mn"));
}
function defaultInventoryEmployeeId() {
  return inventoryEmployees()[0]?.id || "";
}
function normalizeInventoryEmployeeId(currentId) {
  const ids = new Set(inventoryEmployees().map((e) => e.id));
  if (currentId && ids.has(currentId)) return currentId;
  return defaultInventoryEmployeeId();
}
function inventoryEmployeeName(employeeId) {
  return state.employees.find((e) => e.id === employeeId)?.name || "-";
}
function inventoryEmployeeField(selectedId, onChangeHandler) {
  const employees = inventoryEmployees();
  const selected = selectedId || "";
  const options = [`<option value="">Ажилтан сонгох</option>`]
    .concat(
      employees.map(
        (e) =>
          `<option value="${esc(e.id)}"${selected === e.id ? " selected" : ""}>${esc(e.name)}</option>`,
      ),
    )
    .join("");
  return `<label class="stock-in-employee"><span class="stock-in-employee__label">Ажилтан</span><select class="field-input app-input" onchange="${onChangeHandler}(this.value)">${options}</select></label>`;
}
function stockInEmployees() {
  return inventoryEmployees();
}
function ensureStockInSession() {
  if (!state.stockInSessionStartedAt) {
    state.stockInSessionStartedAt = new Date().toISOString();
    state.stockInDone = false;
    state.stockInReceipt = null;
  }
  if (!state.stockInEmployeeId) {
    state.stockInEmployeeId = defaultInventoryEmployeeId();
  } else {
    state.stockInEmployeeId = normalizeInventoryEmployeeId(
      state.stockInEmployeeId,
    );
  }
}
function ensureStockOutSession() {
  if (!state.stockOutEmployeeId) {
    state.stockOutEmployeeId = defaultInventoryEmployeeId();
  } else {
    state.stockOutEmployeeId = normalizeInventoryEmployeeId(
      state.stockOutEmployeeId,
    );
  }
}
function stockInSessionActive() {
  return !!state.stockInSessionStartedAt && !state.stockInDone;
}
function stockInDraftEntry(id) {
  if (!state.stockInDraft[id]) state.stockInDraft[id] = {};
  return state.stockInDraft[id];
}
function stockInLineQty(p) {
  const d = state.stockInDraft[p.id] || {};
  const packSize = productPackSize(p);
  const packs = Math.max(0, Math.floor(Number(d.packs) || 0));
  const pieces = Math.max(0, Math.floor(Number(d.qty) || 0));
  if (packSize) return packs * packSize + pieces;
  return pieces;
}
function stockInLineCost(p) {
  const d = state.stockInDraft[p.id] || {};
  const draftCost = Number(d.costPrice);
  if (Number.isFinite(draftCost) && draftCost > 0) return draftCost;
  return productCostPrice(p) || 0;
}
function stockInCostExceedsSalesPrice(costPrice, p) {
  const cost = Number(costPrice);
  const sales = productSalesPrice(p);
  return Number.isFinite(cost) && cost > 0 && sales > 0 && cost > sales;
}
function stockInCostPriceWarn(el, salesPrice) {
  const warn = el
    ?.closest?.("form")
    ?.querySelector("[data-stock-in-cost-warn]");
  if (!warn) return;
  const cost = Number(el.value || 0);
  const show =
    Number.isFinite(cost) && cost > 0 && salesPrice > 0 && cost > salesPrice;
  warn.classList.toggle("hidden", !show);
}
function stockInReceiptLineUnitPrice(line) {
  const unitPrice = Number(line?.unitPrice ?? line?.costPrice);
  return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
}
function stockInReceiptLineTotal(line) {
  const quantity = Number(line?.quantity) || 0;
  const unitPrice = stockInReceiptLineUnitPrice(line);
  if (quantity > 0 && unitPrice > 0) return quantity * unitPrice;
  const storedTotal = Number(line?.totalPrice);
  return Number.isFinite(storedTotal) ? storedTotal : 0;
}
function normalizeStockInReceiptTotals(receipt) {
  const lines = (receipt?.lines || []).map((line) => {
    const unitPrice = stockInReceiptLineUnitPrice(line);
    const totalPrice = stockInReceiptLineTotal(line);
    return {
      ...line,
      costPrice: unitPrice || Number(line.costPrice) || 0,
      unitPrice: unitPrice || Number(line.unitPrice) || 0,
      totalPrice,
    };
  });
  return {
    ...receipt,
    lines,
    totalAmount: lines.reduce(
      (sum, line) => sum + stockInReceiptLineTotal(line),
      0,
    ),
  };
}
function stockInHasEntries() {
  return state.products.some((p) => stockInLineQty(p) > 0);
}
function stockInEntryProducts(list) {
  return list.filter((p) => stockInLineQty(p) > 0);
}
function startStockInSession() {
  state.stockInDraft = {};
  state.stockInDone = false;
  state.stockInReceipt = null;
  state.stockInSessionStartedAt = new Date().toISOString();
  if (!state.stockInEmployeeId) {
    state.stockInEmployeeId = defaultInventoryEmployeeId();
  }
}
function resetStockInSession() {
  startStockInSession();
  render();
}
function setStockInEmployee(id) {
  ensureStockInSession();
  state.stockInEmployeeId = id || "";
  render();
}
function setStockOutEmployee(id) {
  ensureStockOutSession();
  state.stockOutEmployeeId = id || "";
  render();
}
function stockInEmployeeName() {
  return inventoryEmployeeName(state.stockInEmployeeId);
}
function stockOutEmployeeName() {
  return inventoryEmployeeName(state.stockOutEmployeeId);
}
function stockInProductsGrouped(products) {
  const sorted = [...products].sort((a, b) => {
    const byCat = (a.category || "").localeCompare(b.category || "", "mn");
    if (byCat) return byCat;
    return (a.name || "").localeCompare(b.name || "", "mn");
  });
  const groups = [];
  let lastCat = null;
  for (const p of sorted) {
    const cat = p.category || "Бусад";
    if (cat !== lastCat) {
      groups.push({ type: "cat", name: cat });
      lastCat = cat;
    }
    groups.push({ type: "product", product: p });
  }
  return groups;
}
function stockInReceiptDateParts(at) {
  const d = at ? new Date(at) : new Date();
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}
function stockInReceiptMonthKey(at) {
  const day = isoDay(at || new Date().toISOString());
  return day ? day.slice(0, 7) : todayIso().slice(0, 7);
}
function formatStockInReceiptPrefix(monthKey) {
  const [y, m] = String(monthKey || "").split("-");
  if (!y || !m) return "";
  return `${String(y).slice(-2)}${m}`;
}
function formatStockInReceiptNumber(monthKey, seq) {
  return `${formatStockInReceiptPrefix(monthKey)}-${seq}`;
}
function stockInReceiptSeqFromNumber(receiptNumber, monthKey) {
  const prefix = formatStockInReceiptPrefix(monthKey);
  const text = String(receiptNumber || "");
  if (!prefix || !text.startsWith(`${prefix}-`)) return 0;
  const seq = Number(text.slice(prefix.length + 1));
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}
function usedStockInReceiptSeqs(monthKey) {
  const used = new Set();
  for (const receipt of state.stockInReceipts || []) {
    if (stockInReceiptMonthKey(receipt.createdAt) !== monthKey) continue;
    const seq =
      Number(receipt.receiptSeq) ||
      stockInReceiptSeqFromNumber(receipt.receiptNumber, monthKey);
    if (seq > 0) used.add(seq);
  }
  return used;
}
function nextStockInReceiptNumber(createdAt) {
  const monthKey = stockInReceiptMonthKey(createdAt);
  const used = usedStockInReceiptSeqs(monthKey);
  let seq = 1;
  while (used.has(seq)) seq += 1;
  return {
    monthKey,
    receiptSeq: seq,
    receiptNumber: formatStockInReceiptNumber(monthKey, seq),
  };
}
function finalizeStockInReceipt(receipt) {
  if (receipt.receiptNumber) return receipt;
  return { ...receipt, ...nextStockInReceiptNumber(receipt.createdAt) };
}
function stockInReceiptFileName(receipt) {
  const no = receipt?.receiptNumber;
  return no ? `orlogo-avah-${no}.xlsx` : `orlogo-avah-${todayIso()}.xlsx`;
}
function stockInReceiptTitle(receipt) {
  const no = receipt?.receiptNumber;
  return no ? `Орлого авах баримт №${no}` : "Орлого авах баримт";
}
function buildStockInReceiptSnapshot() {
  const lines = stockInEntryProducts(state.products).map((p) => {
    const d = state.stockInDraft[p.id] || {};
    const qty = stockInLineQty(p);
    const packs = Math.max(0, Math.floor(Number(d.packs) || 0));
    const cost = stockInLineCost(p);
    return {
      productId: p.id,
      productName: p.name,
      category: p.category || "",
      barcode: p.barcode || "",
      packs,
      quantity: qty,
      costPrice: cost,
      unitPrice: cost,
      totalPrice: qty * cost,
    };
  });
  return normalizeStockInReceiptTotals({
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    employeeId: state.stockInEmployeeId,
    employeeName: stockInEmployeeName(),
    lines,
  });
}
function applyStockInReceipt(receipt) {
  if (!Array.isArray(state.stockInReceipts)) state.stockInReceipts = [];
  const saved = finalizeStockInReceipt(normalizeStockInReceiptTotals(receipt));
  if (state.stockInReceipts.some((r) => r.id === saved.id)) return saved;
  state.stockInReceipts.push({
    id: saved.id,
    receiptNumber: saved.receiptNumber,
    receiptSeq: saved.receiptSeq,
    monthKey: saved.monthKey,
    createdAt: saved.createdAt,
    employeeId: saved.employeeId,
    employeeName: saved.employeeName,
    lines: saved.lines,
    totalAmount: saved.totalAmount,
  });
  for (const line of saved.lines) {
    const p = state.products.find((x) => x.id === line.productId);
    if (!p) continue;
    const qty = Number(line.quantity) || 0;
    if (qty <= 0) continue;
    if (line.costPrice > 0) p.costPrice = line.costPrice;
    stock(line.productId, qty, "in");
    state.inventoryLogs.push({
      id: nextInventoryLogId(),
      productId: line.productId,
      productName: line.productName,
      type: "in",
      quantity: qty,
      costPrice: line.costPrice,
      packs: line.packs,
      date: saved.createdAt,
      employeeName: saved.employeeName,
      receiptId: saved.id,
      receiptNumber: saved.receiptNumber,
    });
  }
  return saved;
}
function confirmFinishStockIn() {
  ensureStockInSession();
  if (!canManageStockIn()) {
    return alertModal("Эрхгүй", "Орлого бүртгэх эрхгүй.");
  }
  if (!state.stockInEmployeeId) return alert("Ажилтан сонгоно уу");
  if (!stockInHasEntries()) return alert("Орлого оруулна уу");
  const receipt = buildStockInReceiptSnapshot();
  if (!receipt?.lines?.length) return;
  const normalized = normalizeStockInReceiptTotals(receipt);
  const summary = `<p>Хадгалах үед мэдээлэл татагдана.</p><p class="text-sm text-muted-foreground mt-2">Мэдээлэл татахгүй бол «Үгүй» дарна уу. Аль ч тохиолдолд орлого хадгалагдана.</p><p class="text-sm text-muted-foreground mt-2">Ажилтан: <b>${esc(normalized.employeeName)}</b> · ${normalized.lines.length} бараа · ${fmtExcelMoney(normalized.totalAmount)}</p>`;
  confirmModal("Орлогын баримт", summary, {
    confirmLabel: "Хадгалах",
    cancelLabel: "Үгүй",
    onConfirm: () =>
      void finishStockInReceipt(receipt, { downloadExcel: true }),
    onCancel: () =>
      void finishStockInReceipt(receipt, { downloadExcel: false }),
  });
}
async function finishStockInReceipt(receipt, { downloadExcel = false } = {}) {
  if (!receipt?.lines?.length || stockInSaveLock) return;
  stockInSaveLock = true;
  try {
    const saved = applyStockInReceipt(receipt);
    startStockInSession();
    render();
    const ok = await criticalBackendSave();
    if (!ok) {
      const msg =
        backendSaveFailedMessage ||
        "Орлого түр хадгалагдлаа. Интернет холболтоо шалгаад дахин оролдоно уу.";
      showAppToast(msg, "error");
      alertModal("Хадгалах амжилтгүй", esc(msg));
      return;
    }
    showAppToast("Орлого хадгалагдлаа", "success");
    if (downloadExcel) exportStockInExcel(saved);
  } finally {
    stockInSaveLock = false;
  }
}
function confirmNewStockIn() {
  const hasData = stockInHasEntries();
  if (!hasData) {
    resetStockInSession();
    return;
  }
  confirmModal(
    "Шинэ орлого",
    "Одоогийн орлогыг цэвэрлээд шинээр эхлүүлэх үү?",
    {
      confirmLabel: "Шинээр эхлүүлэх",
      danger: true,
      onConfirm: resetStockInSession,
    },
  );
}
function stockInEmployeeField() {
  ensureStockInSession();
  return inventoryEmployeeField(state.stockInEmployeeId, "setStockInEmployee");
}
function stockOutEmployeeField() {
  ensureStockOutSession();
  return inventoryEmployeeField(
    state.stockOutEmployeeId,
    "setStockOutEmployee",
  );
}
function barcodeScannerPanelHtml() {
  return `<div id="barcodeScanner" class="barcode-scanner" hidden><video id="barcodeVideo" playsinline webkit-playsinline muted autoplay></video><div class="barcode-scanner-actions"><span id="barcodeStatus">Баркодоо camera-д ойртуулна уу</span><button type="button" onclick="stopBarcodeScan()" class="btn btn--secondary btn--sm">Хаах</button></div></div>`;
}
function stockInScanToolbarHtml() {
  return `<div class="stock-in-scan"><label class="stock-in-scan__field"><span class="stock-in-scan__label">Баркод</span><div class="barcode-input-row"><input id="stockInBarcodeInput" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="field-input app-input stock-in-scan__input" placeholder="Баркод оруулах..." onkeydown="stockInBarcodeKeydown(event)" aria-label="Баркод"><button type="button" onclick="startBarcodeScan('stockIn')" class="btn btn--primary btn--sm stock-in-scan__btn">Scan</button></div></label>${barcodeScannerPanelHtml()}<p class="stock-in-scan__hint">Scan хийхэд бараа олж тоо, өртөг үнийг автоматаар нэмнэ.</p></div>`;
}
function findProductByBarcode(code) {
  const value = String(code || "").trim();
  if (!value) return null;
  return (
    state.products.find((p) => String(p.barcode || "").trim() === value) ||
    state.products.find((p) => String(p.barcode || "").includes(value)) ||
    null
  );
}
function applyStockInBarcode(code, { qtyDelta = 1 } = {}) {
  ensureStockInSession();
  const product = findProductByBarcode(code);
  if (!product) {
    alert("Бараа олдсонгүй");
    return false;
  }
  const entry = stockInDraftEntry(product.id);
  const packSize = productPackSize(product);
  if (packSize) {
    const pieces = Math.max(0, Math.floor(Number(entry.qty) || 0)) + qtyDelta;
    if (pieces > 0) entry.qty = String(pieces);
    else delete entry.qty;
  } else {
    const current = Math.max(0, Math.floor(Number(entry.qty) || 0));
    entry.qty = String(current + qtyDelta);
  }
  const cost = productCostPrice(product);
  if (cost > 0) {
    entry.costPrice = String(Math.floor(cost));
  }
  state.stockInDone = false;
  state.stockInReceipt = null;
  state.stockInHighlightId = product.id;
  const input = document.getElementById("stockInBarcodeInput");
  if (input) input.value = "";
  render();
  showAppToast(`${product.name} · +${qtyDelta} ш`, "success");
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-stock-in-id="${product.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  setTimeout(() => {
    if (state.stockInHighlightId === product.id) {
      state.stockInHighlightId = "";
      if (
        state.currentView === "inventory" &&
        state.filters.inventory === "in"
      ) {
        render();
      }
    }
  }, 1600);
  return true;
}
function stockInBarcodeKeydown(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const input = document.getElementById("stockInBarcodeInput");
  applyStockInBarcode(input?.value || "");
}
function stockInEntryRow(p) {
  const qty = stockInLineQty(p);
  const cost = stockInLineCost(p);
  const hasEntry = qty > 0;
  const entryMeta = hasEntry
    ? `<span class="stock-in-entry-row__meta"><span class="stock-in-entry-row__meta-qty">${qty} ${esc(p.unit || "ш")}</span>${cost ? `<span class="stock-in-entry-row__meta-cost">Өртөг ${fmt(cost)}</span>` : ""}</span>`
    : `<span class="stock-in-entry-row__hint">Тоо ширхэг оруулах</span>`;
  const salesPrice = productSalesPrice(p);
  const displayStock = (Number(p.stock) || 0) + (hasEntry ? qty : 0);
  return `<button type="button" onclick="stockInEntryModal('${esc(p.id)}')" data-stock-in-id="${esc(p.id)}" class="stock-in-entry-row${hasEntry ? " stock-in-entry-row--filled" : ""}${state.stockInHighlightId === p.id ? " stock-in-entry-row--scan" : ""}"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="${esc(p.name)}" class="stock-in-entry-row__img" loading="lazy" decoding="async"><div class="inventory-stock-row__info min-w-0"><p class="inventory-stock-row__name">${esc(p.name)}</p><p class="inventory-stock-row__barcode">${esc(p.barcode || "-")}</p><span class="inventory-stock-row__stock">Үлдэгдэл: <b>${displayStock} ${esc(p.unit || "ш")}</b>${hasEntry && qty ? `<span class="inventory-stock-row__pending"> (+${qty} хүлээгдэж байна)</span>` : ""}</span><span class="inventory-stock-row__price">Борлуулалтын үнэ: <b>${fmt(salesPrice)}</b></span></div>${entryMeta}</button>`;
}
function stockInPackDerivedPieces(packs, packSize) {
  const pk = Math.max(0, Math.floor(Number(packs) || 0));
  const size = Math.max(0, Math.floor(Number(packSize) || 0));
  return pk * size;
}
function stockInEntryTotalQty(packs, pieces, packSize) {
  return (
    stockInPackDerivedPieces(packs, packSize) +
    Math.max(0, Math.floor(Number(pieces) || 0))
  );
}
function stockInQtyFieldsInput(_el, packSize) {
  const form = _el?.closest?.("form");
  if (!form) return;
  const packs = form.querySelector('input[name="packs"]')?.value ?? "";
  const pieces = form.querySelector('input[name="qty"]')?.value ?? "";
  const packPreview = form.querySelector("[data-stock-in-pack-preview]");
  const totalPreview = form.querySelector("[data-stock-in-qty-total]");
  const size = Math.max(0, Math.floor(Number(packSize) || 0));
  const derived = stockInPackDerivedPieces(packs, size);
  const total = stockInEntryTotalQty(packs, pieces, size);
  if (packPreview) {
    packPreview.textContent = derived
      ? `= ${derived} ширхэг`
      : size
        ? `1 багц = ${size} ширхэг`
        : "";
  }
  if (totalPreview) {
    totalPreview.textContent = total > 0 ? `Нийт: ${total} ширхэг` : "";
  }
}
function stockInPackQtyFieldsHtml(p, d = {}) {
  const packSize = productPackSize(p);
  const packsVal =
    d.packs != null && d.packs !== "" ? esc(String(d.packs)) : "";
  const qtyVal = d.qty != null && d.qty !== "" ? esc(String(d.qty)) : "";
  if (!packSize) {
    return `<label class="block"><span class="field-label">Тоо ширхэг</span><input name="qty" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${qtyVal}" placeholder="0" class="field-input app-input" aria-label="${esc(p.name)} тоо ширхэг"></label>`;
  }
  const derived = stockInPackDerivedPieces(d.packs, packSize);
  const total = stockInEntryTotalQty(d.packs, d.qty, packSize);
  const packPreviewText = derived
    ? `= ${derived} ширхэг`
    : `1 багц = ${packSize} ширхэг`;
  const totalPreviewText = total > 0 ? `Нийт: ${total} ширхэг` : "";
  return `<div class="stock-in-qty-fields"><div class="grid grid-cols-2 gap-2"><label class="block"><span class="field-label">Багцийн тоо</span><input name="packs" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${packsVal}" placeholder="0" class="field-input app-input" aria-label="${esc(p.name)} багцийн тоо" oninput="stockInQtyFieldsInput(this, ${packSize})"><p class="stock-in-pack-preview" data-stock-in-pack-preview>${packPreviewText}</p></label><label class="block"><span class="field-label">Тоо ширхэг</span><input name="qty" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${qtyVal}" placeholder="0" class="field-input app-input" aria-label="${esc(p.name)} тоо ширхэг" oninput="stockInQtyFieldsInput(this, ${packSize})"><p class="stock-in-pack-preview stock-in-pack-preview--spacer" aria-hidden="true">&nbsp;</p></label></div><p class="stock-in-qty-total" data-stock-in-qty-total>${totalPreviewText}</p></div>`;
}
function stockInEntryModal(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  ensureStockInSession();
  const d = state.stockInDraft[p.id] || {};
  const costVal =
    d.costPrice != null && d.costPrice !== "" ? esc(String(d.costPrice)) : "";
  const qtyFields = stockInPackQtyFieldsHtml(p, d);
  const salesPrice = productSalesPrice(p);
  const costExceeds = stockInCostExceedsSalesPrice(costVal || d.costPrice, p);
  box(
    "Орлого оруулах",
    `<form onsubmit="applyStockInEntryModal(event,'${esc(id)}')" class="inventory-stock-modal p-5 space-y-4"><div class="inventory-stock-modal__product"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="" class="product-thumb inventory-stock-modal__thumb"><div class="inventory-stock-modal__info"><p class="inventory-stock-modal__name">${esc(p.name)}</p><p class="inventory-stock-modal__barcode">${esc(p.barcode || "-")}</p><p class="inventory-stock-modal__stock">Үлдэгдэл: <b>${p.stock ?? 0} ${esc(p.unit || "ш")}</b></p><p class="inventory-stock-modal__price">Борлуулалтын үнэ: <b>${fmt(salesPrice)}</b></p></div></div>${qtyFields}<label class="block"><span class="field-label">Өртөг үнэ <span class="text-muted-foreground font-normal">(сонголттой)</span></span><input name="costPrice" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="0" step="1" value="${costVal}" placeholder="${productCostPrice(p) ? esc(String(productCostPrice(p))) : "0"}" class="field-input app-input text-muted-foreground" aria-label="Өртөг үнэ" oninput="stockInCostPriceWarn(this, ${salesPrice})"><p class="text-sm text-tone-warning mt-1${costExceeds ? "" : " hidden"}" data-stock-in-cost-warn>Өртөг үнэ Борлуулалтын үнээс давсан байна</p></label><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="btn btn--secondary">Болих</button><button type="submit" class="btn btn--primary">Хадгалах</button></div></form>`,
    "max-w-md",
  );
}
function applyStockInEntryModal(e, id) {
  e.preventDefault();
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const formData = new FormData(e.target);
  const packSize = productPackSize(p);
  const packs = Math.max(0, Math.floor(Number(formData.get("packs") || 0)));
  const pieces = Math.max(0, Math.floor(Number(formData.get("qty") || 0)));
  const qty = packSize ? packs * packSize + pieces : pieces;
  if (qty <= 0) {
    delete state.stockInDraft[id];
    state.stockInDone = false;
    state.stockInReceipt = null;
    closeModal();
    render();
    return;
  }
  const costPrice = Number(formData.get("costPrice") || 0);
  if (stockInCostExceedsSalesPrice(costPrice, p)) {
    alert("Өртөг үнэ Борлуулалтын үнээс давсан байна");
    return;
  }
  const entry = stockInDraftEntry(id);
  if (packSize) {
    if (packs > 0) entry.packs = String(packs);
    else delete entry.packs;
    if (pieces > 0) entry.qty = String(pieces);
    else delete entry.qty;
  } else {
    entry.qty = String(pieces);
    delete entry.packs;
  }
  if (Number.isFinite(costPrice) && costPrice > 0) {
    entry.costPrice = String(Math.floor(costPrice));
  } else {
    delete entry.costPrice;
  }
  state.stockInDone = false;
  state.stockInReceipt = null;
  closeModal();
  render();
}
function stockInReceiptRow(line) {
  const unitPrice = stockInReceiptLineUnitPrice(line);
  const totalPrice = stockInReceiptLineTotal(line);
  return `<div class="stock-in-table__row"><span class="stock-in-table__name">${esc(line.productName)}</span><span class="stock-in-table__barcode">${esc(line.barcode || "-")}</span><span class="stock-in-table__pack">${line.packs || "-"}</span><span class="stock-in-table__qty">${line.quantity}</span><span class="stock-in-table__money">${fmt(unitPrice)}</span><span class="stock-in-table__money">${fmt(unitPrice)}</span><span class="stock-in-table__money stock-in-table__money--total">${fmt(totalPrice)}</span></div>`;
}
function stockInTableHead(mode = "entry") {
  if (mode === "entry") {
    return `<div class="stock-in-table__head stock-in-table__head--entry"><span>Барааны нэр</span><span>Barcode</span><span>Багцийн тоо</span><span>Тоо ширхэг</span><span>Өртөг үнэ</span></div>`;
  }
  return `<div class="stock-in-table__head"><span>Барааны нэр</span><span>Barcode</span><span>Багцийн тоо</span><span>Тоо ширхэг</span><span>Өртөг үнэ</span><span>Нэгж үнэ</span><span>Нийт үнэ</span></div>`;
}
function stockInEntryList(list) {
  const groups = stockInProductsGrouped(list);
  const rows = groups
    .map((item) =>
      item.type === "cat"
        ? `<div class="stock-in-entry-cat">${esc(item.name)}</div>`
        : stockInEntryRow(item.product),
    )
    .join("");
  return `<div class="bg-card rounded overflow-hidden inventory-stock-panel"><div class="inventory-stock-panel__hint px-4 py-3 text-sm text-muted-foreground bg-secondary/40 border-b border-border">Баркод scan эсвэл бараа дээр дарж тоо ширхэг оруулна уу.</div><div class="divide-y divide-border">${rows || `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function stockInReceiptGroupedLines(lines) {
  const byCat = {};
  for (const line of lines) {
    const cat = line.category || "Бусад";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(line);
  }
  return Object.keys(byCat)
    .sort((a, b) => a.localeCompare(b, "mn"))
    .flatMap((cat) => {
      const catLines = byCat[cat];
      const catTotal = catLines.reduce(
        (sum, line) => sum + stockInReceiptLineTotal(line),
        0,
      );
      return [
        { type: "cat", name: cat },
        ...catLines.map((line) => ({ type: "line", line })),
        { type: "catTotal", name: cat, amount: catTotal },
      ];
    });
}
function stockInCategoryTotalRow(name, amount) {
  return `<div class="stock-in-table__foot stock-in-table__foot--cat"><span class="stock-in-table__foot-label">${esc(name)} нийт</span><span class="stock-in-table__money stock-in-table__money--total">${fmt(amount)}</span></div>`;
}
function stockInReceiptPanel(receipt) {
  receipt = normalizeStockInReceiptTotals(receipt);
  const groups = stockInReceiptGroupedLines(receipt.lines);
  const rows = groups
    .map((item) => {
      if (item.type === "cat") {
        return `<div class="stock-in-table__cat">${esc(item.name)}</div>`;
      }
      if (item.type === "catTotal") {
        return stockInCategoryTotalRow(item.name, item.amount);
      }
      return stockInReceiptRow(item.line);
    })
    .join("");
  const date = stockInReceiptDateParts(receipt.createdAt);
  return `<section class="stock-in-receipt-panel"><header class="stock-in-receipt-panel__head"><div><p class="stock-in-receipt-panel__title">Орлого авах баримт</p><p class="stock-in-receipt-panel__sub">Ажилтан: ${esc(receipt.employeeName)} · ${receipt.lines.length} бараа</p></div></header><div class="stock-in-table stock-in-table--receipt"><div class="stock-in-table__scroll">${stockInTableHead("receipt")}<div class="stock-in-table__body">${rows}</div><div class="stock-in-table__foot"><span class="stock-in-table__foot-label">Нийт дүн</span><span class="stock-in-table__money stock-in-table__money--total">${fmt(receipt.totalAmount)}</span></div></div></div><footer class="stock-in-receipt-panel__signatures"><div class="stock-in-sign"><span>Хүлээлгэн өгсөн:</span><span class="stock-in-sign__line">_____________________ (гарын үсэг)</span></div><div class="stock-in-sign"><span>Хүлээн авсан:</span><span class="stock-in-sign__line">______________________ (гарын үсэг)</span></div><div class="stock-in-sign stock-in-sign--date"><span>Баримтын огноо:</span><span>${date.day} / ${date.month} / ${date.year}</span></div></footer><footer class="stock-in-receipt-panel__foot">${excelDownloadBtn("confirmStockInExcel()", { extraClass: "btn--toolbar-block" })}</footer></section>`;
}
function stockInPanel(list) {
  ensureStockInSession();
  return `<div class="space-y-4 stock-in-view">${stockInEmployeeField()}${stockInScanToolbarHtml()}${stockInEntryList(list)}<div class="grid grid-cols-2 gap-2"><button type="button" onclick="confirmFinishStockIn()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button><button type="button" onclick="confirmNewStockIn()" class="py-3 bg-secondary rounded font-medium">Шинэ</button></div></div>`;
}
function stockOutPanel(list) {
  ensureStockOutSession();
  return `<div class="space-y-4 stock-out-view">${stockOutEmployeeField()}${stockActionList(list, "out")}</div>`;
}
function exportStockInExcel(receipt) {
  receipt = normalizeStockInReceiptTotals(receipt);
  if (!receipt?.lines?.length) return alert("Орлогын баримт байхгүй");
  exportStockInExcelXlsx(receipt).catch(() =>
    exportStockInExcelFallback(receipt),
  );
}
function confirmStockInExcel() {
  return alert("Эхлээд орлогоо дуусгана уу");
}
function exportStockInExcelFallback(receipt) {
  receipt = normalizeStockInReceiptTotals(receipt);
  const receivedDateValue = warehouseSheetDateValue(
    receipt.createdAt
      ? new Date(receipt.createdAt).toISOString().slice(0, 10)
      : todayIso(),
  );
  const printedDateValue = warehouseSheetDateValue(todayIso());
  const h = (value) => xlsxXmlEsc(value ?? "");
  const bodyRows = stockInReceiptGroupedLines(receipt.lines)
    .map((item) => {
      if (item.type === "cat") {
        return `<tr><td colspan="7" class="cat">${h(item.name)}</td></tr>`;
      }
      if (item.type === "catTotal") {
        return `<tr class="cat-total"><td colspan="6" style="text-align:right">${h(item.name)} нийт</td><td class="num">${fmtExcelMoney(item.amount)}</td></tr>`;
      }
      const line = item.line;
      const unitPrice = stockInReceiptLineUnitPrice(line);
      return `<tr><td>${h(line.productName)}</td><td class="barcode">${h(line.barcode || "")}</td><td class="num">${line.packs || ""}</td><td class="num">${line.quantity}</td><td class="num">${fmtExcelMoney(unitPrice)}</td><td class="num">${fmtExcelMoney(unitPrice)}</td><td class="num">${fmtExcelMoney(stockInReceiptLineTotal(line))}</td></tr>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: Arial, sans-serif; color: #000; }
table.stock-in { width: 1100px; border-collapse: collapse; table-layout: fixed; font-size: 18px; }
.stock-in col:nth-child(1) { width: 260px; }
.stock-in col:nth-child(2) { width: 140px; }
.stock-in col:nth-child(3) { width: 80px; }
.stock-in col:nth-child(4) { width: 100px; }
.stock-in col:nth-child(5) { width: 120px; }
.stock-in col:nth-child(6) { width: 120px; }
.stock-in col:nth-child(7) { width: 140px; }
.stock-in td, .stock-in th { border: 1px solid #555; padding: 4px 6px; vertical-align: middle; }
.title { text-align: center; font-size: 28px; font-weight: 800; height: 56px; }
.meta td { border: none; padding: 4px 0; }
.date-label { text-align: right; white-space: nowrap; }
.date-value { text-align: left; white-space: nowrap; }
.head th { text-align: center; font-weight: 800; background: #eef0f2; }
.cat { text-align: center; font-weight: 800; background: #f7f7f7; }
.cat-total td { font-weight: 700; background: #f3f4f6; }
.barcode { mso-number-format:"\\@"; text-align: center; }
.num { text-align: right; }
.total td { font-weight: 800; }
.sign td { border: none; padding-top: 18px; }
</style></head><body><table class="stock-in">
<colgroup><col><col><col><col><col><col><col></colgroup>
<tr><td colspan="7" class="title">${h(stockInReceiptTitle(receipt))}</td></tr>
<tr class="meta"><td colspan="4">Ажилтан: ${h(receipt.employeeName)} · ${receipt.lines.length} бараа</td><td colspan="2" class="date-label">Орлого авсан огноо:</td><td class="date-value">${h(receivedDateValue.trim())}</td></tr>
<tr class="meta"><td colspan="4"></td><td colspan="2" class="date-label">Хэвлэсэн огноо:</td><td class="date-value">${h(printedDateValue.trim())}</td></tr>
<tr class="head"><th>Барааны нэр</th><th>Barcode</th><th>Багц</th><th>Тоо ширхэг</th><th>Өртөг үнэ</th><th>Нэгж үнэ</th><th>Нийт үнэ</th></tr>
${bodyRows}
<tr class="total"><td colspan="6" style="text-align:right">Нийт дүн</td><td class="num">${fmtExcelMoney(receipt.totalAmount)}</td></tr>
<tr class="sign"><td colspan="7">Хүлээлгэн өгсөн: _____________________ (гарын үсэг)</td></tr>
<tr class="sign"><td colspan="7">Хүлээн авсан: ________________________ (гарын үсэг)</td></tr>
</table></body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  void downloadBlobFile(
    blob,
    legacyExcelFileName(stockInReceiptFileName(receipt)),
  );
}
function stockActionRow(p, tab) {
  const openModal =
    tab === "out"
      ? `stockOutModal('${esc(p.id)}')`
      : `inventoryStockModal('${esc(p.id)}','${tab}')`;
  return `<button type="button" onclick="${openModal}" class="inventory-stock-row"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="${esc(p.name)}" class="product-card__img inventory-stock-row__thumb" loading="lazy" decoding="async"><div class="inventory-stock-row__info min-w-0"><p class="inventory-stock-row__name">${esc(p.name)}</p><p class="inventory-stock-row__barcode">${esc(p.barcode || "-")}</p><span class="inventory-stock-row__stock">Үлдэгдэл: <b>${p.stock ?? 0} ${esc(p.unit || "ш")}</b></span></div></button>`;
}
function stockOutModal(id) {
  ensureStockOutSession();
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  box(
    "Зарлага гаргах",
    `<form onsubmit="applyStockOutModal(event,'${esc(id)}')" class="inventory-stock-modal p-5 space-y-4"><div class="inventory-stock-modal__product"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="" class="product-thumb inventory-stock-modal__thumb"><div class="inventory-stock-modal__info"><p class="inventory-stock-modal__name">${esc(p.name)}</p><p class="inventory-stock-modal__barcode">${esc(p.barcode || "-")}</p><p class="inventory-stock-modal__stock">Үлдэгдэл: <b>${Number(p.stock) || 0} ${esc(p.unit || "ш")}</b></p></div></div><label class="block"><span class="field-label">Тоо ширхэг</span><input name="quantity" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" placeholder="1" required autofocus class="field-input app-input" aria-label="${esc(p.name)} тоо ширхэг"></label><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="btn btn--secondary">Болих</button><button type="submit" class="btn btn--danger">Зарлага</button></div></form>`,
    "max-w-md",
  );
}
function applyStockOutModal(e, id) {
  e.preventDefault();
  ensureStockOutSession();
  if (!state.stockOutEmployeeId) return alert("Ажилтан сонгоно уу");
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const q = Number(new FormData(e.target).get("quantity") || 0);
  if (!Number.isFinite(q) || q < 1) {
    alert("Тоо оруулна уу");
    return;
  }
  const stockNow = Number(p.stock) || 0;
  if (q > stockNow) {
    alert("Үлдэгдэл хүрэлцэхгүй байна!");
    return;
  }
  const afterStock = stockNow - q;
  confirmModal(
    "Зарлага гаргах",
    `<p><b>${esc(p.name)}</b>-аас <b>${q}</b> ${esc(p.unit || "ш")} зарлага гаргах уu?</p><p class="text-sm text-muted-foreground mt-2">Үлдэгдэл: ${stockNow} ${esc(p.unit || "ш")} → ${afterStock} ${esc(p.unit || "ш")}</p>`,
    {
      confirmLabel: "Зарлага",
      danger: true,
      onConfirm: () => {
        if (applyStock(id, "out", q)) closeModal();
      },
    },
  );
}
function inventoryStockModal(id, tab) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const isIn = tab === "in",
    title = isIn ? "Орлого авах" : "Зарлага гаргах",
    actionLabel = isIn ? "Орлого" : "Зарлага",
    btnClass = isIn ? "btn--primary" : "btn--danger",
    costField = isIn
      ? `<label class="block"><span class="field-label">Өртөг үнэ</span><input name="costPrice" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" step="1" value="${productCostPrice(p) || ""}" required class="field-input app-input" aria-label="Өртөг үнэ"></label><p class="text-xs text-muted-foreground">Тооллогын зөрүү дүн тооцоолох өртөг үнэ.</p>`
      : "";
  box(
    title,
    `<form onsubmit="applyStockFromModal(event,'${esc(id)}','${tab}')" class="inventory-stock-modal p-5 space-y-4"><div class="inventory-stock-modal__product"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="" class="product-thumb inventory-stock-modal__thumb"><div class="inventory-stock-modal__info"><p class="inventory-stock-modal__name">${esc(p.name)}</p><p class="inventory-stock-modal__barcode">${esc(p.barcode || "-")}</p><p class="inventory-stock-modal__stock">Үлдэгдэл: <b>${p.stock} ${esc(p.unit || "ш")}</b></p></div></div><label class="block"><span class="field-label">Тоо</span><input name="quantity" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" placeholder="1" required ${isIn ? "" : "autofocus"} class="field-input app-input"></label>${costField}<div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="btn btn--secondary">Болих</button><button type="submit" class="btn ${btnClass}">${actionLabel}</button></div></form>`,
    "max-w-md",
  );
}
function applyStockFromModal(e, id, type) {
  e.preventDefault();
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const formData = new FormData(e.target);
  const q = Number(formData.get("quantity") || 0);
  if (!Number.isFinite(q) || q < 1) {
    alert("Тоо оруулна уу");
    return;
  }
  const isIn = type === "in";
  let costPrice = null;
  if (isIn) {
    costPrice = Number(formData.get("costPrice") || 0);
    if (!Number.isFinite(costPrice) || costPrice <= 0) {
      alert("Өртөг үнэ оруулна уу");
      return;
    }
  }
  if (type === "out" && q > p.stock) {
    alert("Үлдэгдэл хүрэлцэхгүй байна!");
    return;
  }
  const title = isIn ? "Орлого авах" : "Зарлага гаргах",
    actionLabel = isIn ? "орлого" : "зарлага",
    afterStock = isIn ? p.stock + q : p.stock - q,
    costLine = isIn
      ? `<p class="text-sm text-muted-foreground mt-1">Өртөг үнэ: <b>${fmt(costPrice)}</b></p>`
      : "",
    summaryHtml = `<p><b>${esc(p.name)}</b> — <b>${q}</b> ${esc(p.unit || "ш")} ${actionLabel} хийх үү?</p>${costLine}<p class="text-sm text-muted-foreground mt-2">Одоо: ${p.stock} ${esc(p.unit || "ш")} → Дараа: ${afterStock} ${esc(p.unit || "ш")}</p>`,
    finalMessage = `<p><strong>${esc(p.name)}</strong>-д <strong>${q}</strong> ${esc(p.unit || "ш")} ${actionLabel} бүртгэхдээ итгэлтэй байна уу?</p>${costLine}<p class="text-sm text-muted-foreground mt-2">Үлдэгдэл: ${p.stock} ${esc(p.unit || "ш")} → ${afterStock} ${esc(p.unit || "ш")}</p>`;
  confirmModal(title, summaryHtml, {
    confirmLabel: "Тийм",
    danger: !isIn,
    onConfirm: () => {
      confirmModal("Баталгаажуулах", finalMessage, {
        confirmLabel: "Батлах",
        onConfirm: () => {
          if (applyStock(id, type, q, costPrice)) closeModal();
        },
        danger: !isIn,
        closable: true,
      });
    },
  });
}
function stockActionList(list, tab) {
  const hint =
    tab === "in"
      ? "Орлого авах бараагаа сонгоно уу."
      : "Зарлага гаргах бараагаа сонгоно уу.";

  return `<div class="bg-card rounded overflow-hidden inventory-stock-panel"><div class="inventory-stock-panel__hint px-4 py-3 text-sm text-muted-foreground bg-secondary/40 border-b border-border">${hint}</div><div class="divide-y divide-border">${list.length ? list.map((p) => stockActionRow(p, tab)).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function stockGrid(list) {
  return `<div class="bg-card rounded overflow-hidden"><div class="hidden md:grid grid-cols-[48px_minmax(0,1fr)_140px_140px_120px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Зураг</span><span>Бараа</span><span>Төрөл</span><span>Баркод</span><span class="text-right">Үлдэгдэл</span></div><div class="divide-y divide-border">${list.length ? list.map((p) => `<div class="p-4 flex items-center gap-3 md:grid md:grid-cols-[48px_minmax(0,1fr)_140px_140px_120px] md:items-center md:gap-3"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="${esc(p.name)}" class="product-thumb shrink-0" loading="lazy" decoding="async"><div class="min-w-0 flex-1 md:flex-none"><p class="font-medium truncate">${esc(p.name)}</p><p class="md:hidden text-xs text-muted-foreground mt-1">${esc(p.category || "-")} · ${esc(p.barcode || "-")}</p></div><span class="hidden md:block text-sm">${esc(p.category || "-")}</span><span class="hidden md:block text-sm font-mono">${esc(p.barcode || "-")}</span><b class="shrink-0 ml-auto whitespace-nowrap md:ml-0 md:text-right">${p.stock} ${esc(p.unit || "ш")}</b></div>`).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function countFilteredProducts() {
  const q = (state.searches.count || "").toLowerCase().trim(),
    cat = state.filters.countCategory || "all";
  return state.products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) || String(p.barcode || "").includes(q)
    );
  });
}
function countCategoryLabel(cat = state.filters.countCategory || "all") {
  return cat === "all" ? "Бүх бараа" : cat;
}
function setCountCategory(cat) {
  state.filters.countCategory = cat || "all";
  render();
}
function categoryFilterChipBtn(label, value, active, handler) {
  const isActive = active === value;
  return `<button type="button" onclick="${handler}(${jsStringArg(value)})" class="picker-cat-chip${isActive ? " is-active" : ""}" aria-pressed="${isActive ? "true" : "false"}">${esc(label)}</button>`;
}
function categoryFilterChipsHtml({
  active = "all",
  allLabel = "Бүгд",
  allValue = "all",
  handler = "setCountCategory",
} = {}) {
  const chips = cats()
    .map((c) => categoryFilterChipBtn(c, c, active, handler))
    .join("");
  return `<div class="inventory-categories picker-cat-chips" role="tablist" aria-label="Төрөлөөр шүүх">${categoryFilterChipBtn(allLabel, allValue, active, handler)}${chips}</div>`;
}
function countSessionSinceMs() {
  const t = state.countSessionStartedAt;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
function inventoryLogProductId(log) {
  if (log?.productId) return String(log.productId);
  const name = String(log.productName || "")
    .trim()
    .toLowerCase();
  if (!name) return "";
  const hit = state.products.find(
    (p) =>
      String(p.name || "")
        .trim()
        .toLowerCase() === name,
  );
  return hit?.id || "";
}
function nextInventoryLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function countInventoryQty(productId, type) {
  const since = countSessionSinceMs();
  return state.inventoryLogs
    .filter((l) => l.type === type)
    .filter((l) => inventoryLogProductId(l) === productId)
    .filter((l) => {
      if (!since) return true;
      const ms = new Date(l.date).getTime();
      return Number.isFinite(ms) ? ms >= since : true;
    })
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
}
function countSoldQty(productId) {
  const since = countSessionSinceMs();
  let total = 0;
  for (const o of state.orders) {
    if (String(o.status || "").toLowerCase() === "cancelled") continue;
    if (since) {
      const ms = new Date(o.createdAt).getTime();
      if (Number.isFinite(ms) && ms < since) continue;
    }
    for (const item of o.items || []) {
      if (item.productId === productId) {
        total += Number(item.quantity) || 0;
      }
    }
  }
  return total;
}
function countUsesSnapshot() {
  return (
    (countSessionActive() || state.countDone) &&
    state.countOpeningStock &&
    Object.keys(state.countOpeningStock).length > 0
  );
}
function countOpeningForProduct(id, system) {
  if (!countUsesSnapshot()) return system;
  if (Object.prototype.hasOwnProperty.call(state.countOpeningStock, id)) {
    return Number(state.countOpeningStock[id]) || 0;
  }
  return system;
}
function countProductStats(p) {
  const id = p.id;
  const system = Number(p.stock) || 0;
  const final = countValue(id);
  if (!countUsesSnapshot()) {
    return {
      opening: system,
      sold: 0,
      expended: 0,
      income: 0,
      system,
      expected: system,
      final,
    };
  }
  const opening = countOpeningForProduct(id, system);
  const sold = countSoldQty(id);
  const expended = countInventoryQty(id, "out");
  const income = countInventoryQty(id, "in");
  const expected = opening + income - sold - expended;
  return { opening, sold, expended, income, system, expected, final };
}
function countBookDiff(stats) {
  if (stats.final === null) return null;
  return stats.final - stats.system;
}
function productCostPrice(p) {
  return Number(p?.costPrice) || 0;
}
function productSalesPrice(p) {
  return Number(p?.price) || 0;
}
function countQtyAmount(qty, p) {
  return Number(qty || 0) * productCostPrice(p);
}
function countDiffAmount(diff, p) {
  if (diff === null || diff === undefined) return null;
  return diff * productCostPrice(p);
}
function countDiffAmountText(diff, p) {
  if (!canViewProductCost()) return "-";
  const cost = productCostPrice(p);
  if (!cost) return "-";
  const amt = countDiffAmount(diff, p);
  if (amt === null) return "-";
  return fmt(amt);
}
function countDiffQtyText(diff) {
  if (diff === null) return "-";
  return diff > 0 ? `+${fmtCountQty(diff)}` : fmtCountQty(diff);
}
function countResultQtyCell(value, label) {
  const text = value === null || value === undefined ? "-" : fmtCountQty(value);
  return `<span class="count-result-table__num" data-label="${esc(label)}" title="${esc(label)}: ${esc(text)}">${text}</span>`;
}
function countSessionActive() {
  return !!state.countSessionStartedAt;
}
function startCountSession() {
  state.countQty = {};
  state.countDone = false;
  state.countOpeningStock = {};
  state.countSessionStartedAt = new Date().toISOString();
  snapshotCountOpeningStock();
  scheduleBackendSave();
}
function ensureCountSession() {
  if (!countSessionActive()) startCountSession();
}
function ensureCountSessionQuiet(focusId) {
  if (countSessionActive()) return;
  state.countDone = false;
  state.countOpeningStock = {};
  state.countSessionStartedAt = new Date().toISOString();
  snapshotCountOpeningStock();
  document.querySelector(".count-view__hint")?.remove();
  if (focusId) refreshCountRowMeta(focusId);
  scheduleBackendSave();
}
function refreshCountRowMeta(id) {
  const p = state.products.find((x) => x.id === id);
  const input = document.querySelector(
    `input[data-count-product-id="${CSS.escape(id)}"]`,
  );
  const meta = input?.closest(".count-row")?.querySelector(".count-row__stats");
  if (!p || !meta) return;
  const stats = countProductStats(p);
  if (countSessionActive()) {
    meta.innerHTML = `<span>Эхний: <b>${stats.opening}</b></span><span>Борлуулсан: <b>${stats.sold}</b></span><span>Зарлага: <b>${stats.expended}</b></span>${productCostMetaHtml(p)}`;
  } else {
    meta.innerHTML = `<span>Бүртгэл: <b>${stats.system}</b></span>${productCostMetaHtml(p)}`;
  }
}
function syncCountInputsFromState() {
  if (state.countDone) return;
  countInputSyncing = true;
  try {
    document
      .querySelectorAll(".count-row__input[data-count-product-id]")
      .forEach((input) => {
        if (input === document.activeElement) return;
        const id = input.getAttribute("data-count-product-id") || "";
        const v = countValue(id);
        input.value = v == null ? "" : String(v);
      });
  } finally {
    countInputSyncing = false;
  }
}
function updateCountMetricsInPlace() {
  if (state.countDone || state.currentView !== "count") return;
  const list = countFilteredProducts();
  const countedProducts = list.filter((p) => countValue(p.id) !== null);
  const counted = countedProducts.length;
  const values = document.querySelectorAll(
    ".count-view .metrics-bar--count .metrics-bar__value",
  );
  if (values[0]) values[0].textContent = String(counted);
  if (values[1]) values[1].textContent = String(list.length);
  if (countSessionActive() && counted && canViewProductCost()) {
    const t = countMetricsTotals(countedProducts);
    if (values[2]) values[2].textContent = fmt(t.openingValue);
    if (values[3]) values[3].textContent = fmt(t.soldValue);
    if (values[4]) values[4].textContent = fmt(t.expendedValue);
    if (values[5]) values[5].textContent = fmt(t.diffValue);
  }
}
function updateCountRowDiffDisplay(id, inputEl) {
  const p = state.products.find((x) => x.id === id);
  const row = inputEl?.closest(".count-row");
  const diffEl = row?.querySelector(".count-row__diff");
  const diffAmtEl = row?.querySelector(".count-row__diff-amt");
  if (!p || !diffEl) return;
  const raw = String(inputEl.value ?? "").trim();
  const final =
    raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw);
  const system = Number(p.stock) || 0;
  const diff = final === null ? null : final - system;
  const diffClass =
    diff === null || diff === 0
      ? "text-muted-foreground"
      : "count-result-table__diff--bad";
  diffEl.textContent = countDiffQtyText(diff);
  diffEl.className = `count-row__diff ${diffClass}`;
  if (diffAmtEl) {
    diffAmtEl.textContent = countDiffAmountText(diff, p);
    diffAmtEl.className = `count-row__diff-amt ${diffClass}`;
  }
}
function countQtyFocus(id, el) {
  clearTimeout(countBlurSaveTimer);
  countFocusedProductId = id;
  ensureCountSessionQuiet(id);
  if (countSessionActive()) refreshCountRowMeta(id);
}
function countQtyInput(id, el) {
  if (countInputSyncing) return;
  if (!countSessionActive()) ensureCountSessionQuiet(id);
  const digits = String(el?.value ?? "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  if (!digits) delete state.countQty[id];
  else {
    const n = Number(digits);
    if (!Number.isFinite(n)) return;
    state.countQty[id] = n;
  }
  state.countDone = false;
  updateCountRowDiffDisplay(id, el);
  updateCountMetricsInPlace();
}
function countQtyCommit(id, el) {
  if (!el?.isConnected) return;
  countQtyInput(id, el);
  if (localStateDirty()) scheduleBackendSave();
  countFocusedProductId = "";
  requestAnimationFrame(flushPendingCountRender);
}
function initCountInputHandlers() {
  if (document.documentElement.dataset.countInputBound) return;
  document.documentElement.dataset.countInputBound = "1";
  document.addEventListener(
    "focusin",
    (e) => {
      const el = e.target.closest?.(".count-row__input[data-count-product-id]");
      if (!el) return;
      const id = el.getAttribute("data-count-product-id") || "";
      if (id) countQtyFocus(id, el);
    },
    true,
  );
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target.closest?.(".count-row__input[data-count-product-id]");
      if (!el) return;
      const id = el.getAttribute("data-count-product-id") || "";
      if (id) countQtyInput(id, el);
    },
    true,
  );
  document.addEventListener(
    "focusout",
    (e) => {
      const el = e.target.closest?.(".count-row__input[data-count-product-id]");
      if (!el) return;
      const id = el.getAttribute("data-count-product-id") || "";
      if (!id) return;
      const next = e.relatedTarget;
      if (next?.closest?.(".count-row__input[data-count-product-id]")) return;
      clearTimeout(countBlurSaveTimer);
      countBlurSaveTimer = setTimeout(() => {
        countBlurSaveTimer = null;
        if (
          document.activeElement?.matches?.(
            ".count-row__input[data-count-product-id]",
          )
        ) {
          return;
        }
        if (!el.isConnected) return;
        countQtyCommit(id, el);
      }, 150);
    },
    true,
  );
}
function countMetricsTotals(products) {
  let opening = 0,
    sold = 0,
    expended = 0,
    income = 0,
    expected = 0,
    system = 0,
    final = 0,
    openingValue = 0,
    soldValue = 0,
    expendedValue = 0,
    incomeValue = 0,
    expectedValue = 0,
    systemValue = 0,
    finalValue = 0,
    diffValue = 0;
  for (const p of products) {
    const stats = countProductStats(p);
    if (stats.final === null) continue;
    const cost = productCostPrice(p);
    opening += stats.opening;
    sold += stats.sold;
    expended += stats.expended;
    income += stats.income || 0;
    expected += stats.expected ?? stats.system;
    system += stats.system;
    final += stats.final;
    openingValue += stats.opening * cost;
    soldValue += stats.sold * cost;
    expendedValue += stats.expended * cost;
    incomeValue += (stats.income || 0) * cost;
    expectedValue += (stats.expected ?? stats.system) * cost;
    systemValue += stats.system * cost;
    finalValue += stats.final * cost;
    const diff = countBookDiff(stats);
    if (diff !== null) diffValue += diff * cost;
  }
  return {
    opening,
    sold,
    expended,
    income,
    expected,
    system,
    final,
    openingValue,
    soldValue,
    expendedValue,
    incomeValue,
    expectedValue,
    systemValue,
    finalValue,
    diffValue,
  };
}
function snapshotCountOpeningStock() {
  const opening = {};
  for (const p of state.products) {
    opening[p.id] = Number(p.stock) || 0;
  }
  state.countOpeningStock = opening;
}
function countView() {
  const q = state.searches.count || "",
    cat = state.filters.countCategory || "all",
    list = countFilteredProducts(),
    counted = list.filter((p) => countValue(p.id) !== null).length,
    mismatches = countMismatchesForList(list),
    countedProducts = list.filter((p) => countValue(p.id) !== null),
    metricsHtml = state.countDone
      ? (() => {
          const t = countMetricsTotals(countedProducts);
          const diffTone =
            t.diffValue !== 0 ? "text-tone-danger" : "text-tone-success";
          const qtyBar = metricsBar(
            `${card("Эхний үлдэгдэл", t.opening)}${card("Борлуулсан", t.sold)}${card("Зарлагдсан", t.expended)}${card("Эцсийн үлдэгдэл", t.final)}`,
            "4",
            "count",
          );
          if (!canViewProductCost()) return qtyBar;
          return `${qtyBar}${metricsBar(
            `${card("Эхний дүн", fmt(t.openingValue))}${card("Борлуулалт", fmt(t.soldValue))}${card("Зарлага", fmt(t.expendedValue))}${card("Зөрүү дүн", fmt(t.diffValue), diffTone)}`,
            "4",
            "count count-values",
          )}`;
        })()
      : (() => {
          const base = metricsBar(
            `${card("Тоолсон", counted)}${card("Бараа", list.length)}`,
            "2",
            "count",
          );
          if (!countSessionActive() || !countedProducts.length) return base;
          if (!canViewProductCost()) return base;
          const t = countMetricsTotals(countedProducts);
          const diffTone =
            t.diffValue !== 0 ? "text-tone-danger" : "text-tone-success";
          return `${base}${metricsBar(
            `${card("Эхний дүн", fmt(t.openingValue))}${card("Борлуулалт", fmt(t.soldValue))}${card("Зарлага", fmt(t.expendedValue))}${card("Зөрүү дүн", fmt(t.diffValue), diffTone)}`,
            "4",
            "count count-values",
          )}`;
        })();
  const sessionHint =
    countSessionActive() || state.countDone
      ? ""
      : `<p class="count-view__hint">Тоо оруулах эсвэл «Шинэ» дарж тооллого эхлүүлнэ.</p>`;
  const countListPanel = state.countDone
    ? ""
    : `<div class="line-panel">${categoryFilterChipsHtml({ active: cat, allLabel: "Бүх бараа", handler: "setCountCategory" })}<input data-focus="count" value="${esc(q)}" oninput="search('count',this.value)" placeholder="Хайх..." class="line-panel__search app-input"><div class="count-list">${list.length ? list.map(countRow).join("") : `<p class="line-panel__empty">Бараа олдсонгүй</p>`}</div></div>`;
  return `<div class="space-y-4 count-view">${pageHead("Тооллого")}${sessionHint}${metricsHtml}${countListPanel}<div class="grid grid-cols-2 gap-2"><button onclick="confirmFinishCount()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button><button type="button" onclick="confirmNewCount()" class="py-3 bg-secondary rounded font-medium">Шинэ</button></div>${state.countDone ? countResult(mismatches) : ""}</div>`;
}
function countRow(p) {
  const stats = countProductStats(p),
    diff = countBookDiff(stats),
    diffText = countDiffQtyText(diff),
    diffAmtText = countDiffAmountText(diff, p),
    diffClass =
      diff === null || diff === 0
        ? "text-muted-foreground"
        : "count-result-table__diff--bad",
    metaHtml = countSessionActive()
      ? `<span>Эхний: <b>${stats.opening}</b></span><span>Борлуулсан: <b>${stats.sold}</b></span><span>Зарлага: <b>${stats.expended}</b></span>${productCostMetaHtml(p)}`
      : `<span>Бүртгэл: <b>${stats.system}</b></span>${productCostMetaHtml(p)}`;
  return `<article class="count-row"><div class="count-row__main"><div class="count-row__lead"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="" class="count-row__img" loading="lazy" decoding="async"><p class="count-row__title">${esc(p.name)}</p></div><div class="count-row__meta count-row__stats">${metaHtml}</div><div class="count-row__actions"><input id="count-qty-${esc(p.id)}" name="countQty-${esc(p.id)}" data-count-product-id="${p.id}" placeholder="0" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="count-row__input app-input" aria-label="${esc(p.name)} эцсийн үлдэгдэл"><div class="count-row__diff-wrap"><span class="count-row__diff ${diffClass}" title="Зөрүү (бүртгэлээс)">${diffText}</span>${canViewProductCost() ? `<span class="count-row__diff-amt ${diffClass}" title="Зөрүү дүн">${diffAmtText}</span>` : ""}</div></div></div></article>`;
}
function countValue(id) {
  const value = state.countQty[id];
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function setCountQty(id, value) {
  ensureCountSession();
  if (value === "") delete state.countQty[id];
  else state.countQty[id] = Number(value);
  state.countDone = false;
  scheduleBackendSave();
  render();
}
function countMismatches() {
  return state.products
    .map((p) => {
      const stats = countProductStats(p);
      if (stats.final === null) return null;
      const diff = countBookDiff(stats);
      return diff === 0
        ? null
        : { product: p, stats, counted: stats.final, diff };
    })
    .filter(Boolean);
}
function countMismatchesForList(list) {
  const ids = new Set(list.map((p) => p.id));
  return countMismatches().filter((row) => ids.has(row.product.id));
}
function countResult(mismatches) {
  const list = countFilteredProducts().filter((p) => countValue(p.id) !== null);
  const mismatchCount = mismatches.length;
  const showCost = canViewProductCost();
  const headHtml = `<div class="count-result-table__head" role="row"><span class="count-result-table__head-name" role="columnheader">Бараа</span><span class="count-result-table__head-num" role="columnheader" title="Тооллого эхлэх үеийн үлдэгдэл">Эхний үлдэгдэл</span><span class="count-result-table__head-num" role="columnheader" title="Тооллого хугацаанд борлуулсан">Борлуулсан</span><span class="count-result-table__head-num" role="columnheader" title="Тооллого хугацаанд зарлагдсан">Зарлагдсан</span><span class="count-result-table__head-num" role="columnheader" title="Тооллогын эцсийн үлдэгдэл">Эцсийн үлдэгдэл</span>${showCost ? `<span class="count-result-table__head-num" role="columnheader" title="Нэгжийн өртөг үнэ">Өртөг үнэ</span>` : ""}<span class="count-result-table__head-num" role="columnheader" title="Тоолсон − бүртгэл">Зөрүү</span>${showCost ? `<span class="count-result-table__head-num" role="columnheader" title="Зөрүүний дүн">Зөрүү дүн</span>` : ""}</div>`;
  const rowHtml = list
    .map((p) => {
      const stats = countProductStats(p),
        diff = countBookDiff(stats),
        cost = productCostPrice(p),
        diffClass =
          diff === null || diff === 0
            ? "count-result-table__diff"
            : "count-result-table__diff count-result-table__diff--bad",
        diffText = countDiffQtyText(diff),
        diffAmtText = countDiffAmountText(diff, p);
      return `<div class="count-result-table__row${diff !== 0 && diff !== null ? " count-result-table__row--mismatch" : ""}" role="row"><span class="count-result-table__name" role="cell" title="${esc(p.name)}">${esc(p.name)}</span>${countResultQtyCell(stats.opening, "Эхний үлдэгдэл")}${countResultQtyCell(stats.sold, "Борлуулсан")}${countResultQtyCell(stats.expended, "Зарлагдсан")}${countResultQtyCell(stats.final, "Эцсийн үлдэгдэл")}${showCost ? `<span class="count-result-table__num" data-label="Өртөг үнэ" title="Өртөг үнэ: ${esc(cost ? fmt(cost) : "-")}">${cost ? fmt(cost) : "-"}</span>` : ""}<span class="${diffClass}" data-label="Зөрүү" title="Зөрүү: ${esc(diffText)}">${diffText}</span>${showCost ? `<span class="${diffClass} count-result-table__amount" data-label="Зөрүү дүн" title="Зөрүү дүн: ${esc(diffAmtText)}">${diffAmtText}</span>` : ""}</div>`;
    })
    .join("");
  const badgeClass = mismatchCount
    ? "count-result-panel__badge count-result-panel__badge--warn"
    : "count-result-panel__badge count-result-panel__badge--ok";
  const badgeText = mismatchCount ? `Зөрүүтэй: ${mismatchCount}` : "Зөрүүгүй";
  return `<section class="count-result-panel"><header class="count-result-panel__head"><div class="count-result-panel__head-copy"><p class="count-result-panel__title">Тооллого хадгалагдлаа</p><p class="count-result-panel__sub">${list.length} бараа тоолсон</p></div><span class="${badgeClass}">${badgeText}</span></header>${list.length ? `<div class="count-result-table"><p class="count-result-table__hint">Хажуугаар гүйлгэж бүх баганыг харна уу</p><div class="count-result-table__scroll">${headHtml}<div class="count-result-table__body">${rowHtml}</div></div></div>` : `<div class="count-result-panel__empty">Тоолсон бараа байхгүй</div>`}${mismatchCount === 0 && list.length ? `<div class="count-result-panel__success">Бүх барааны тоо таарч байна</div>` : ""}<footer class="count-result-panel__foot">${excelDownloadBtn("confirmCountExcel()", { extraClass: "btn--toolbar-block" })}</footer></section>`;
}
function countExportProducts() {
  return countFilteredProducts().filter((p) => countValue(p.id) !== null);
}
function countExcelRows() {
  return countExportProducts().map((p) => {
    const stats = countProductStats(p);
    const diff = countBookDiff(stats);
    const cost = productCostPrice(p);
    return [
      p.name,
      p.barcode || "-",
      stats.opening,
      stats.income || 0,
      stats.sold,
      stats.expended,
      stats.expected ?? stats.system,
      stats.system,
      stats.final,
      diff,
      cost,
      countDiffAmount(diff, p),
      p.unit || "ш",
    ];
  });
}
function countSheetProductsGrouped() {
  const ids = new Set(countExportProducts().map((p) => p.id));
  const products = state.products
    .filter((p) => ids.has(p.id))
    .sort(
      (a, b) =>
        String(a.category || "").localeCompare(
          String(b.category || ""),
          "mn",
        ) || String(a.name || "").localeCompare(String(b.name || ""), "mn"),
    );
  const groups = [];
  let cur = "";
  for (const p of products) {
    const cat = p.category || "Бусад";
    if (cat !== cur) {
      groups.push({ type: "cat", name: cat });
      cur = cat;
    }
    groups.push({ type: "product", product: p });
  }
  return groups;
}
function countSheetDateLabel() {
  const d = new Date();
  return `Огноо: ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
function xlsxXmlEsc(s) {
  return String(s ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function isMobileExcelExportDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "");
}
function xlsxPackageRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}
function xlsxPackageCoreXml() {
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>TOMUDA</dc:creator><cp:lastModifiedBy>TOMUDA</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`;
}
function xlsxPackageAppXml(sheetCount = 1) {
  const titles = Array.from(
    { length: sheetCount },
    (_, i) => `<vt:lpstr>Sheet${i + 1}</vt:lpstr>`,
  ).join("");
  // NOTE: </vt:vector> after HeadingPairs is required — omitting it makes the
  // whole package invalid and strict apps (Numbers, mobile Excel) refuse to open it.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>TOMUDA</Application><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheetCount}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${sheetCount}" baseType="lpstr">${titles}</vt:vector></TitlesOfParts></Properties>`;
}
function styledWorkbookRelsXml(sheetCount) {
  const rels = [];
  for (let i = 1; i <= sheetCount; i += 1) {
    rels.push(
      `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`,
    );
  }
  const stylesId = sheetCount + 1;
  const stringsId = sheetCount + 2;
  rels.push(
    `<Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    `<Relationship Id="rId${stringsId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`,
  );
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`;
}
function styledContentTypesXml(sheetIds, { hasLogo = false } = {}) {
  const parts = [
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
  ];
  if (hasLogo) {
    parts.push(`<Default Extension="png" ContentType="image/png"/>`);
  }
  parts.push(
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
  );
  sheetIds.forEach((id) => {
    parts.push(
      `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
  });
  parts.push(
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`,
  );
  if (hasLogo) {
    sheetIds.forEach((id) => {
      parts.push(
        `<Override PartName="/xl/drawings/drawing${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
      );
    });
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${parts.join("")}</Types>`;
}
async function assembleStyledXlsxZip(
  built,
  { hasLogo = false, logoBuffer = null } = {},
) {
  const zip = new JSZip();
  const sheetIds = built.sheets.map((s) => s.id);
  xlsxZipWriteUtf8(
    zip,
    "[Content_Types].xml",
    styledContentTypesXml(sheetIds, { hasLogo }),
  );
  xlsxZipWriteUtf8(zip, "_rels/.rels", xlsxPackageRootRelsXml());
  xlsxZipWriteUtf8(zip, "docProps/core.xml", xlsxPackageCoreXml());
  xlsxZipWriteUtf8(zip, "docProps/app.xml", xlsxPackageAppXml(sheetIds.length));
  xlsxZipWriteUtf8(zip, "xl/workbook.xml", built.workbookXml);
  xlsxZipWriteUtf8(
    zip,
    "xl/_rels/workbook.xml.rels",
    styledWorkbookRelsXml(sheetIds.length),
  );
  xlsxZipWriteUtf8(zip, "xl/styles.xml", receiptXlsxStylesXml());
  xlsxZipWriteUtf8(zip, "xl/sharedStrings.xml", built.sharedStringsXml);
  built.sheets.forEach((sheet) => {
    xlsxZipWriteUtf8(zip, `xl/worksheets/sheet${sheet.id}.xml`, sheet.sheetXml);
    if (hasLogo) {
      xlsxZipWriteUtf8(
        zip,
        `xl/worksheets/_rels/sheet${sheet.id}.xml.rels`,
        receiptSheetRelsXml(sheet.id),
      );
      xlsxZipWriteUtf8(
        zip,
        `xl/drawings/drawing${sheet.id}.xml`,
        receiptDrawingXml(),
      );
      xlsxZipWriteUtf8(
        zip,
        `xl/drawings/_rels/drawing${sheet.id}.xml.rels`,
        receiptDrawingRelsXml(),
      );
    }
  });
  if (hasLogo && logoBuffer) {
    zip.file("xl/media/receipt-logo.png", logoBuffer, zipFileOptions());
  }
  return zipToExcelBlob(zip);
}
function xlsxColName(n) {
  let s = "";
  let num = n;
  while (num > 0) {
    const mod = (num - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}
function xlsxSharedStringsXml(strings) {
  const items = strings
    .map((s) => {
      const text = xlsxXmlEsc(s);
      const preserve = /^\s|\s$/.test(String(s ?? ""))
        ? ' xml:space="preserve"'
        : "";
      return `<si><t${preserve}>${text}</t></si>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}
function xlsxCellXml(ref, styleId, value, kind) {
  if (kind === "n") {
    return `<c r="${ref}" s="${styleId}"><v>${xlsxSafeNumber(value)}</v></c>`;
  }
  if (kind === "s") {
    return `<c r="${ref}" s="${styleId}" t="s"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${styleId}"/>`;
}
function xlsxRowXml(rowNum, height, cells, lastCol = "J") {
  const ht = height ? ` ht="${height}" customHeight="1"` : "";
  const body = cells.join("");
  const spanEnd = "ABCDEFGHIJKLMNOP".indexOf(lastCol) + 1;
  return `<row r="${rowNum}" spans="1:${spanEnd}"${ht}>${body}</row>`;
}
const COUNT_XLSX_LAST_COL = "M";
const PRODUCT_XLSX_LAST_COL = "H";
const PRODUCT_SHEET_TEMPLATE =
  "/static/tomuda/templates/count-sheet-template.xls";
function buildProductSheetXml() {
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const products = productsExportList();
  const dateLabel = productSheetDateLabel();
  const groups = productSheetProductsGrouped(products);
  const rows = [];
  const merges = [
    `A1:${PRODUCT_XLSX_LAST_COL}1`,
    `A2:${PRODUCT_XLSX_LAST_COL}2`,
  ];
  let rowNum = 1;
  const pushRow = (height, cells) => {
    rows.push(
      `<row r="${rowNum}" spans="1:8"${height ? ` ht="${height}" customHeight="1"` : ""}>${cells.join("")}</row>`,
    );
    rowNum += 1;
  };
  const emptyCells = (
    row,
    from = "A",
    to = PRODUCT_XLSX_LAST_COL,
    style = 1,
  ) => {
    const cols = "ABCDEFGH".slice(
      "ABCDEFGH".indexOf(from),
      "ABCDEFGH".indexOf(to) + 1,
    );
    return cols
      .split("")
      .map((col) => xlsxCellXml(`${col}${row}`, style, null, "empty"));
  };
  pushRow(43.5, [
    xlsxCellXml("A1", 13, si("Барааны жагсаалт"), "s"),
    ...emptyCells(1, "B", PRODUCT_XLSX_LAST_COL),
  ]);
  pushRow(28.5, [
    xlsxCellXml("A2", 3, si(`Нийт бараа: ${products.length}`), "s"),
    ...emptyCells(2, "B", "G"),
    xlsxCellXml(`H2`, 14, si(dateLabel), "s"),
  ]);
  pushRow(12, emptyCells(3));
  pushRow(18, [
    xlsxCellXml("A4", 7, si("№"), "s"),
    xlsxCellXml("B4", 7, si("Баркод"), "s"),
    xlsxCellXml("C4", 7, si("Барааны нэр"), "s"),
    xlsxCellXml("D4", 7, si("Төрөл"), "s"),
    xlsxCellXml("E4", 7, si("Борлуулалтын үнэ"), "s"),
    xlsxCellXml("F4", 7, si("Өртөг үнэ"), "s"),
    xlsxCellXml("G4", 7, si("Үлдэгдэл"), "s"),
    xlsxCellXml("H4", 7, si("Нэгж"), "s"),
  ]);
  for (const item of groups) {
    if (item.type === "cat") {
      const r = rowNum;
      pushRow(18, [
        xlsxCellXml(`A${r}`, 15, si(item.name), "s"),
        ...emptyCells(r, "B", PRODUCT_XLSX_LAST_COL),
      ]);
      merges.push(`A${r}:${PRODUCT_XLSX_LAST_COL}${r}`);
      continue;
    }
    const p = item.product;
    const r = rowNum;
    pushRow(15.75, [
      xlsxCellXml(`A${r}`, 10, item.index, "n"),
      xlsxCellXml(`B${r}`, 9, si(p.barcode || "-"), "s"),
      xlsxCellXml(`C${r}`, 8, si(p.name || ""), "s"),
      xlsxCellXml(`D${r}`, 8, si(p.category || ""), "s"),
      xlsxCellXml(`E${r}`, 10, Number(p.price) || 0, "n"),
      xlsxCellXml(`F${r}`, 10, productCostPrice(p), "n"),
      xlsxCellXml(`G${r}`, 10, Number(p.stock) || 0, "n"),
      xlsxCellXml(`H${r}`, 8, si(p.unit || "ширхэг"), "s"),
    ]);
  }
  const lastRow = rowNum - 1;
  const mergeXml = merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${PRODUCT_XLSX_LAST_COL}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="16" customWidth="1"/><col min="3" max="3" width="28" customWidth="1"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/><col min="7" max="7" width="10" customWidth="1"/><col min="8" max="8" width="12" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${mergeXml}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sharedStringsXml: xlsxSharedStringsXml(strings), sheetXml };
}
async function exportProductsExcelXlsx() {
  if (!canViewProductCost()) {
    exportProductsExcelFallback();
    return;
  }
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const products = productsExportList();
  if (!products.length) return alert("Бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  const { sharedStringsXml, sheetXml } = buildProductSheetXml();
  const tpl = await fetch(staticAssetUrl(PRODUCT_SHEET_TEMPLATE)).then((r) => {
    if (!r.ok) throw new Error("template missing");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, `baraa-${stamp}.xlsx`);
}
function buildCountSheetXml() {
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const emp = state.currentEmployee?.name || "-";
  const dateLabel = countSheetDateLabel();
  const products = countExportProducts();
  const totals = countMetricsTotals(products);
  const mismatchCount = countMismatchesForList(products).length;
  const groups = countSheetProductsGrouped();
  const rows = [];
  const merges = [
    `A1:${COUNT_XLSX_LAST_COL}1`,
    `F2:${COUNT_XLSX_LAST_COL}2`,
    `A3:${COUNT_XLSX_LAST_COL}3`,
  ];
  let rowNum = 1;
  const pushRow = (height, cells) => {
    rows.push(xlsxRowXml(rowNum, height, cells, COUNT_XLSX_LAST_COL));
    rowNum += 1;
  };
  const emptyCells = (row, from = "A", to = COUNT_XLSX_LAST_COL, style = 1) => {
    const cols = "ABCDEFGHIJKLM".slice(
      "ABCDEFGHIJKLM".indexOf(from),
      "ABCDEFGHIJKLM".indexOf(to) + 1,
    );
    return cols
      .split("")
      .map((col) => xlsxCellXml(`${col}${row}`, style, null, "empty"));
  };
  pushRow(43.5, [
    xlsxCellXml("A1", 13, si("Тооллогын тайлан"), "s"),
    ...emptyCells(1, "B", COUNT_XLSX_LAST_COL, 13),
  ]);
  pushRow(28.5, [
    xlsxCellXml("A2", 3, si("Агуулахын ажилтан:"), "s"),
    xlsxCellXml("B2", 4, si(emp), "s"),
    xlsxCellXml("C2", 5, null, "empty"),
    xlsxCellXml("D2", 5, null, "empty"),
    xlsxCellXml("E2", 5, null, "empty"),
    xlsxCellXml("F2", 14, si(dateLabel), "s"),
    ...emptyCells(2, "G", COUNT_XLSX_LAST_COL, 14),
  ]);
  pushRow(24, [
    xlsxCellXml(
      "A3",
      3,
      si(
        `Тоолсон: ${products.length} бараа · ${mismatchCount ? `Зөрүүтэй: ${mismatchCount}` : "Зөрүүгүй"} · Хүлээгдэж буй = Эхний + Орлого − Борлуулсан − Зарлагдсан · Зөрүү = Тоолсон − Бүртгэл`,
      ),
      "s",
    ),
    ...emptyCells(3, "B", COUNT_XLSX_LAST_COL, 3),
  ]);
  pushRow(16.5, emptyCells(rowNum));
  const headerRow = rowNum;
  pushRow(30.75, [
    xlsxCellXml(`A${headerRow}`, 7, si("Бараа"), "s"),
    xlsxCellXml(`B${headerRow}`, 7, si("Баркод"), "s"),
    xlsxCellXml(`C${headerRow}`, 7, si("Эхний үлдэгдэл"), "s"),
    xlsxCellXml(`D${headerRow}`, 7, si("Орлого"), "s"),
    xlsxCellXml(`E${headerRow}`, 7, si("Борлуулсан"), "s"),
    xlsxCellXml(`F${headerRow}`, 7, si("Зарлагдсан"), "s"),
    xlsxCellXml(`G${headerRow}`, 7, si("Хүлээгдэж буй"), "s"),
    xlsxCellXml(`H${headerRow}`, 7, si("Бүртгэл"), "s"),
    xlsxCellXml(`I${headerRow}`, 7, si("Тоолсон"), "s"),
    xlsxCellXml(`J${headerRow}`, 7, si("Зөрүү"), "s"),
    xlsxCellXml(`K${headerRow}`, 7, si("Өртөг үнэ"), "s"),
    xlsxCellXml(`L${headerRow}`, 7, si("Зөрүү дүн"), "s"),
    xlsxCellXml(`M${headerRow}`, 7, si("Нэгж"), "s"),
  ]);
  for (const item of groups) {
    if (item.type === "cat") {
      const r = rowNum;
      merges.push(`A${r}:${COUNT_XLSX_LAST_COL}${r}`);
      pushRow(24, [
        xlsxCellXml(`A${r}`, 15, si(item.name), "s"),
        ...emptyCells(r, "B", COUNT_XLSX_LAST_COL, 15),
      ]);
      continue;
    }
    const p = item.product;
    const stats = countProductStats(p);
    const diff = countBookDiff(stats);
    const cost = productCostPrice(p);
    const diffAmount = countDiffAmount(diff, p) ?? 0;
    const r = rowNum;
    pushRow(15.75, [
      xlsxCellXml(`A${r}`, 8, si(p.name), "s"),
      xlsxCellXml(`B${r}`, 9, si(p.barcode || "-"), "s"),
      xlsxCellXml(`C${r}`, 10, stats.opening, "n"),
      xlsxCellXml(`D${r}`, 10, stats.income || 0, "n"),
      xlsxCellXml(`E${r}`, 10, stats.sold, "n"),
      xlsxCellXml(`F${r}`, 10, stats.expended, "n"),
      xlsxCellXml(`G${r}`, 10, stats.expected ?? stats.system, "n"),
      xlsxCellXml(`H${r}`, 10, stats.system, "n"),
      xlsxCellXml(`I${r}`, 10, stats.final ?? 0, "n"),
      xlsxCellXml(`J${r}`, 10, diff ?? 0, "n"),
      xlsxCellXml(`K${r}`, 10, cost, "n"),
      xlsxCellXml(`L${r}`, 10, diffAmount, "n"),
      xlsxCellXml(`M${r}`, 8, si(p.unit || "ш"), "s"),
    ]);
  }
  const totalRow = rowNum;
  pushRow(24, [
    xlsxCellXml(`A${totalRow}`, 7, si("Нийт (ш)"), "s"),
    xlsxCellXml(`B${totalRow}`, 7, si(""), "s"),
    xlsxCellXml(`C${totalRow}`, 10, totals.opening, "n"),
    xlsxCellXml(`D${totalRow}`, 10, totals.income, "n"),
    xlsxCellXml(`E${totalRow}`, 10, totals.sold, "n"),
    xlsxCellXml(`F${totalRow}`, 10, totals.expended, "n"),
    xlsxCellXml(`G${totalRow}`, 10, totals.expected, "n"),
    xlsxCellXml(`H${totalRow}`, 10, totals.system, "n"),
    xlsxCellXml(`I${totalRow}`, 10, totals.final, "n"),
    xlsxCellXml(`J${totalRow}`, 10, null, "empty"),
    xlsxCellXml(`K${totalRow}`, 10, null, "empty"),
    xlsxCellXml(`L${totalRow}`, 10, null, "empty"),
    xlsxCellXml(`M${totalRow}`, 7, si(""), "s"),
  ]);
  const totalValueRow = rowNum;
  pushRow(24, [
    xlsxCellXml(`A${totalValueRow}`, 7, si("Нийт (₮)"), "s"),
    xlsxCellXml(`B${totalValueRow}`, 7, si(""), "s"),
    xlsxCellXml(`C${totalValueRow}`, 10, totals.openingValue, "n"),
    xlsxCellXml(`D${totalValueRow}`, 10, totals.incomeValue, "n"),
    xlsxCellXml(`E${totalValueRow}`, 10, totals.soldValue, "n"),
    xlsxCellXml(`F${totalValueRow}`, 10, totals.expendedValue, "n"),
    xlsxCellXml(`G${totalValueRow}`, 10, totals.expectedValue, "n"),
    xlsxCellXml(`H${totalValueRow}`, 10, totals.systemValue, "n"),
    xlsxCellXml(`I${totalValueRow}`, 10, totals.finalValue, "n"),
    xlsxCellXml(`J${totalValueRow}`, 10, null, "empty"),
    xlsxCellXml(`K${totalValueRow}`, 10, null, "empty"),
    xlsxCellXml(`L${totalValueRow}`, 10, totals.diffValue, "n"),
    xlsxCellXml(`M${totalValueRow}`, 7, si(""), "s"),
  ]);
  pushRow(16.5, emptyCells(rowNum));
  const sign1 = rowNum;
  merges.push(`A${sign1}:B${sign1}`, `C${sign1}:E${sign1}`);
  pushRow(null, [
    xlsxCellXml(`A${sign1}`, 17, si("Хүлээлгэн өгсөн ажилтан:"), "s"),
    xlsxCellXml(`B${sign1}`, 17, null, "empty"),
    xlsxCellXml(
      `C${sign1}`,
      18,
      si("/...................................................../"),
      "s",
    ),
    xlsxCellXml(`D${sign1}`, 18, null, "empty"),
    xlsxCellXml(`E${sign1}`, 18, null, "empty"),
    xlsxCellXml(`F${sign1}`, 1, null, "empty"),
    xlsxCellXml(`G${sign1}`, 1, null, "empty"),
    xlsxCellXml(`H${sign1}`, 1, null, "empty"),
  ]);
  const sign2 = rowNum;
  merges.push(`C${sign2}:E${sign2}`);
  pushRow(null, [
    xlsxCellXml(`A${sign2}`, 12, null, "empty"),
    xlsxCellXml(`B${sign2}`, 12, null, "empty"),
    xlsxCellXml(`C${sign2}`, 16, si("гарын үсэг"), "s"),
    xlsxCellXml(`D${sign2}`, 16, null, "empty"),
    xlsxCellXml(`E${sign2}`, 16, null, "empty"),
    xlsxCellXml(`F${sign2}`, 1, null, "empty"),
    xlsxCellXml(`G${sign2}`, 1, null, "empty"),
    xlsxCellXml(`H${sign2}`, 1, null, "empty"),
  ]);
  const sign3 = rowNum;
  merges.push(`A${sign3}:B${sign3}`, `C${sign3}:E${sign3}`);
  pushRow(null, [
    xlsxCellXml(`A${sign3}`, 17, si("Хүлээн авсан ажилтан:"), "s"),
    xlsxCellXml(`B${sign3}`, 17, null, "empty"),
    xlsxCellXml(
      `C${sign3}`,
      18,
      si("/...................................................../"),
      "s",
    ),
    xlsxCellXml(`D${sign3}`, 18, null, "empty"),
    xlsxCellXml(`E${sign3}`, 18, null, "empty"),
    xlsxCellXml(`F${sign3}`, 1, null, "empty"),
    xlsxCellXml(`G${sign3}`, 1, null, "empty"),
    xlsxCellXml(`H${sign3}`, 1, null, "empty"),
  ]);
  const sign4 = rowNum;
  merges.push(`C${sign4}:E${sign4}`);
  pushRow(null, [
    xlsxCellXml(`C${sign4}`, 16, si("гарын үсэг"), "s"),
    xlsxCellXml(`D${sign4}`, 16, null, "empty"),
    xlsxCellXml(`E${sign4}`, 16, null, "empty"),
    xlsxCellXml(`F${sign4}`, 1, null, "empty"),
    xlsxCellXml(`G${sign4}`, 1, null, "empty"),
    xlsxCellXml(`H${sign4}`, 1, null, "empty"),
  ]);
  const lastRow = rowNum;
  const mergeXml = merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${COUNT_XLSX_LAST_COL}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="4" width="10" customWidth="1"/><col min="5" max="5" width="11" customWidth="1"/><col min="6" max="6" width="11" customWidth="1"/><col min="7" max="7" width="13" customWidth="1"/><col min="8" max="8" width="10" customWidth="1"/><col min="9" max="9" width="10" customWidth="1"/><col min="10" max="10" width="9" customWidth="1"/><col min="11" max="11" width="11" customWidth="1"/><col min="12" max="12" width="12" customWidth="1"/><col min="13" max="13" width="10" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${mergeXml}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sharedStringsXml: xlsxSharedStringsXml(strings), sheetXml };
}
const COUNT_SHEET_TEMPLATE =
  "/static/tomuda/templates/count-sheet-template.xls";
async function exportCountExcelXlsx() {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const rows = countExcelRows();
  if (!rows.length) return alert("Тоолсон бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  const { sharedStringsXml, sheetXml } = buildCountSheetXml();
  const tpl = await fetch(staticAssetUrl(COUNT_SHEET_TEMPLATE)).then((r) => {
    if (!r.ok) throw new Error("template missing");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, `toollogo-${stamp}.xlsx`);
}
const WAREHOUSE_PREPARE_LAST_COL = "F";
const WAREHOUSE_PREPARE_TEMPLATE =
  "/static/tomuda/templates/warehouse-prepare-template.xls";
const STOCK_IN_LAST_COL = "G";
const STOCK_IN_XLSX_TEMPLATE = WAREHOUSE_PREPARE_TEMPLATE;
function buildStockInSheetXml(receipt) {
  receipt = normalizeStockInReceiptTotals(receipt);
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const receivedDateValue = warehouseSheetDateValue(
    receipt.createdAt
      ? new Date(receipt.createdAt).toISOString().slice(0, 10)
      : todayIso(),
  );
  const printedDateValue = warehouseSheetDateValue(todayIso());
  const groups = stockInReceiptGroupedLines(receipt.lines);
  const rows = [];
  const merges = [`A1:${STOCK_IN_LAST_COL}1`, `A2:B2`, `C2:E2`, `C3:E3`];
  let rowNum = 1;
  const pushRow = (height, cells) => {
    rows.push(xlsxRowXml(rowNum, height, cells, STOCK_IN_LAST_COL));
    rowNum += 1;
  };
  const emptyCells = (row, from = "A", to = STOCK_IN_LAST_COL, style = 1) => {
    const cols = "ABCDEFG".slice(
      "ABCDEFG".indexOf(from),
      "ABCDEFG".indexOf(to) + 1,
    );
    return cols
      .split("")
      .map((col) => xlsxCellXml(`${col}${row}`, style, null, "empty"));
  };
  pushRow(43.5, [
    xlsxCellXml("A1", 13, si(stockInReceiptTitle(receipt)), "s"),
    ...emptyCells(1, "B", STOCK_IN_LAST_COL, 13),
  ]);
  pushRow(20.25, [
    xlsxCellXml(
      "A2",
      4,
      si(
        `Ажилтан: ${receipt.employeeName || "-"} · ${receipt.lines.length} бараа`,
      ),
      "s",
    ),
    xlsxCellXml("B2", 4, null, "empty"),
    xlsxCellXml("C2", 14, si("Орлого авсан огноо:"), "s"),
    xlsxCellXml("D2", 14, null, "empty"),
    xlsxCellXml("E2", 14, null, "empty"),
    xlsxCellXml("F2", 14, si(receivedDateValue), "s"),
    xlsxCellXml("G2", 14, null, "empty"),
  ]);
  pushRow(20.25, [
    xlsxCellXml("A3", 6, null, "empty"),
    xlsxCellXml("B3", 6, null, "empty"),
    xlsxCellXml("C3", 14, si("Хэвлэсэн огноо:"), "s"),
    xlsxCellXml("D3", 14, null, "empty"),
    xlsxCellXml("E3", 14, null, "empty"),
    xlsxCellXml("F3", 14, si(printedDateValue), "s"),
    xlsxCellXml("G3", 14, null, "empty"),
  ]);
  pushRow(16.5, emptyCells(rowNum, "A", STOCK_IN_LAST_COL, 2));
  const headerRow = rowNum;
  pushRow(30.75, [
    xlsxCellXml(`A${headerRow}`, 7, si("Барааны нэр"), "s"),
    xlsxCellXml(`B${headerRow}`, 7, si("Barcode"), "s"),
    xlsxCellXml(`C${headerRow}`, 7, si("Багц"), "s"),
    xlsxCellXml(`D${headerRow}`, 7, si("Тоо ширхэг"), "s"),
    xlsxCellXml(`E${headerRow}`, 7, si("Өртөг үнэ"), "s"),
    xlsxCellXml(`F${headerRow}`, 7, si("Нэгж үнэ"), "s"),
    xlsxCellXml(`G${headerRow}`, 7, si("Нийт үнэ"), "s"),
  ]);
  for (const item of groups) {
    if (item.type === "cat") {
      const r = rowNum;
      merges.push(`A${r}:${STOCK_IN_LAST_COL}${r}`);
      pushRow(24, [
        xlsxCellXml(`A${r}`, 15, si(item.name), "s"),
        ...emptyCells(r, "B", STOCK_IN_LAST_COL, 15),
      ]);
      continue;
    }
    if (item.type === "catTotal") {
      const r = rowNum;
      merges.push(`A${r}:F${r}`);
      pushRow(16.5, [
        xlsxCellXml(`A${r}`, 3, si(`${item.name} нийт`), "s"),
        ...emptyCells(r, "B", "F", 3),
        xlsxCellXml(`G${r}`, 10, item.amount, "n"),
      ]);
      continue;
    }
    const line = item.line;
    const r = rowNum;
    const unitPrice = stockInReceiptLineUnitPrice(line);
    pushRow(15, [
      xlsxCellXml(`A${r}`, 8, si(line.productName || ""), "s"),
      xlsxBarcodeCell(`B${r}`, 9, line.barcode, si),
      xlsxOptionalNum(`C${r}`, 10, line.packs),
      xlsxCellXml(`D${r}`, 10, Number(line.quantity) || 0, "n"),
      xlsxCellXml(`E${r}`, 10, unitPrice, "n"),
      xlsxCellXml(`F${r}`, 10, unitPrice, "n"),
      xlsxCellXml(`G${r}`, 10, stockInReceiptLineTotal(line), "n"),
    ]);
  }
  pushRow(16.5, emptyCells(rowNum, "A", STOCK_IN_LAST_COL, 2));
  const totalRow = rowNum;
  merges.push(`A${totalRow}:F${totalRow}`);
  pushRow(16.5, [
    xlsxCellXml(`A${totalRow}`, 10, si("Нийт дүн"), "s"),
    ...emptyCells(totalRow, "B", "F", 10),
    xlsxCellXml(`G${totalRow}`, 10, receipt.totalAmount, "n"),
  ]);
  pushRow(16.5, emptyCells(rowNum, "A", STOCK_IN_LAST_COL, 2));
  const sign1 = rowNum;
  merges.push(`C${sign1}:G${sign1}`);
  pushRow(null, [
    xlsxCellXml(`A${sign1}`, 17, si("Хүлээлгэн өгсөн:"), "s"),
    xlsxCellXml(`B${sign1}`, 18, si("Нэр"), "s"),
    xlsxCellXml(
      `C${sign1}`,
      18,
      si("...................................................."),
      "s",
    ),
    ...emptyCells(sign1, "D", STOCK_IN_LAST_COL, 18),
  ]);
  const sign2 = rowNum;
  merges.push(`C${sign2}:G${sign2}`);
  pushRow(null, [
    xlsxCellXml(`A${sign2}`, 12, null, "empty"),
    xlsxCellXml(`B${sign2}`, 6, si("Гарын үсэг"), "s"),
    xlsxCellXml(
      `C${sign2}`,
      18,
      si("...................................................."),
      "s",
    ),
    ...emptyCells(sign2, "D", STOCK_IN_LAST_COL, 18),
  ]);
  pushRow(16.5, emptyCells(rowNum, "A", STOCK_IN_LAST_COL, 2));
  const sign3 = rowNum;
  merges.push(`C${sign3}:G${sign3}`);
  pushRow(null, [
    xlsxCellXml(`A${sign3}`, 17, si("Хүлээн авсан:"), "s"),
    xlsxCellXml(`B${sign3}`, 18, si("Нэр"), "s"),
    xlsxCellXml(
      `C${sign3}`,
      18,
      si("...................................................."),
      "s",
    ),
    ...emptyCells(sign3, "D", STOCK_IN_LAST_COL, 18),
  ]);
  const sign4 = rowNum;
  merges.push(`C${sign4}:G${sign4}`);
  pushRow(null, [
    xlsxCellXml(`A${sign4}`, 12, null, "empty"),
    xlsxCellXml(`B${sign4}`, 6, si("Гарын үсэг"), "s"),
    xlsxCellXml(
      `C${sign4}`,
      18,
      si("...................................................."),
      "s",
    ),
    ...emptyCells(sign4, "D", STOCK_IN_LAST_COL, 18),
  ]);
  const lastRow = rowNum;
  const mergeXml = merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${STOCK_IN_LAST_COL}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="8" customWidth="1"/><col min="4" max="4" width="10" customWidth="1"/><col min="5" max="5" width="12" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/><col min="7" max="7" width="14" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${mergeXml}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sharedStringsXml: xlsxSharedStringsXml(strings), sheetXml };
}
async function exportStockInExcelXlsx(receipt) {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const { sharedStringsXml, sheetXml } = buildStockInSheetXml(receipt);
  const tpl = await fetch(staticAssetUrl(STOCK_IN_XLSX_TEMPLATE)).then((r) => {
    if (!r.ok) throw new Error("template missing");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  zip.file("xl/styles.xml", warehousePrepareStylesXml());
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, stockInReceiptFileName(receipt));
}
function warehouseDateLabel(prefix, raw = todayIso()) {
  const parts = String(raw).split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (y && m && d) return `${prefix}: ${y}/${m}/${d}`;
  }
  return `${prefix}: ${raw}`;
}
function warehouseSheetDateValue(raw = todayIso()) {
  const parts = String(raw).split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (y && m && d) {
      return ` ${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
    }
  }
  return ` ${raw}`;
}
function warehouseSheetDateLabel() {
  return warehouseDateLabel("Огноо", state.filters.warehouseDate || todayIso());
}
function warehouseOrderDateLabel() {
  return warehouseDateLabel(
    "Захиалга авсан огноо",
    state.filters.warehouseDate || todayIso(),
  );
}
function warehousePrintedDateLabel() {
  return warehouseDateLabel("Хэвлэсэн огноо", todayIso());
}
function warehousePrepareProduct(row) {
  const id = row.productId;
  const name = row.productName;
  if (id) {
    const byId = state.products.find((x) => String(x.id) === String(id));
    if (byId) return byId;
  }
  if (name) {
    const key = String(name).trim().toLowerCase();
    const byName = state.products.find(
      (x) =>
        String(x.name || "")
          .trim()
          .toLowerCase() === key,
    );
    if (byName) return byName;
  }
  return {
    id: id || name || "",
    name: name || id || "-",
    category: "Бусад",
    unit: "",
    barcode: "",
    stock: 0,
    boxQuantity: 0,
  };
}
function warehouseOrderProductsGrouped(orders, opts = {}) {
  const promoOnly = !!opts.promoOnly;
  const map = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      if (!!i.isPromoFree !== promoOnly) return;
      const key = i.productId || i.productName;
      if (!map[key]) {
        map[key] = {
          productId: i.productId,
          productName: i.productName,
          qty: 0,
        };
      }
      map[key].qty += i.quantity;
    }),
  );
  const items = Object.values(map)
    .map((row) => {
      const p = warehousePrepareProduct(row);
      return { product: p, qty: row.qty };
    })
    .sort(
      (a, b) =>
        String(a.product.category || "").localeCompare(
          String(b.product.category || ""),
          "mn",
        ) ||
        String(a.product.name || "").localeCompare(
          String(b.product.name || ""),
          "mn",
        ),
    );
  const groups = [];
  let cur = "";
  for (const item of items) {
    const cat = item.product.category || "Бусад";
    if (cat !== cur) {
      groups.push({ type: "cat", name: cat });
      cur = cat;
    }
    groups.push({ type: "product", product: item.product, qty: item.qty });
  }
  return groups;
}
function warehouseOrderPrepareSections(orders) {
  return {
    regular: warehouseOrderProductsGrouped(orders, { promoOnly: false }),
    promo: warehouseOrderProductsGrouped(orders, { promoOnly: true }),
  };
}
function xlsxOptionalNum(ref, styleId, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return xlsxCellXml(ref, styleId, null, "empty");
  }
  return xlsxCellXml(ref, styleId, n, "n");
}
function xlsxBarcodeCell(ref, styleId, barcode, si) {
  const digits = String(barcode ?? "").replace(/\D/g, "");
  if (!digits) return xlsxCellXml(ref, styleId, null, "empty");
  const n = Number(digits);
  if (!Number.isSafeInteger(n)) {
    return xlsxCellXml(ref, styleId, si(digits), "s");
  }
  return xlsxCellXml(ref, styleId, n, "n");
}
const WAREHOUSE_PREPARE_CAT_HEIGHTS = [24, 24.75, 27.75];
function buildWarehousePrepareSheetXml(orders, workerIds) {
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const warehouseEmp = state.currentEmployee?.name || "-";
  const orderDateLabel = "Захиалгын огноо:";
  const orderDateValue = warehouseSheetDateValue(
    state.filters.warehouseDate || todayIso(),
  );
  const printedDateLabel = "Хэвлэсэн огноо:";
  const printedDateValue = warehouseSheetDateValue(todayIso());
  const workerNames = state.employees
    .filter((e) => workerIds.includes(e.id))
    .map((e) => e.name);
  const sections = warehouseOrderPrepareSections(orders);
  const rows = [];
  const merges = [`A1:${WAREHOUSE_PREPARE_LAST_COL}1`, `C2:E2`, `C3:E3`];
  let rowNum = 1;
  let catIndex = 0;
  const pushRow = (height, cells) => {
    rows.push(xlsxRowXml(rowNum, height, cells, WAREHOUSE_PREPARE_LAST_COL));
    rowNum += 1;
  };
  const warehousePrepareMetaRow = (row, label, value, dateLabel, dateValue) => [
    xlsxCellXml(`A${row}`, 3, si(label), "s"),
    xlsxCellXml(`B${row}`, 4, si(value), "s"),
    xlsxCellXml(`C${row}`, 14, si(dateLabel), "s"),
    xlsxCellXml(`D${row}`, 14, null, "empty"),
    xlsxCellXml(`E${row}`, 14, null, "empty"),
    xlsxCellXml(`F${row}`, 14, si(dateValue), "s"),
  ];
  const warehousePrepareWorkerExtraRow = (row, name) => [
    xlsxCellXml(`A${row}`, 6, null, "empty"),
    xlsxCellXml(`B${row}`, 4, si(name), "s"),
    xlsxCellXml(`C${row}`, 5, null, "empty"),
    xlsxCellXml(`D${row}`, 6, null, "empty"),
    xlsxCellXml(`E${row}`, 5, null, "empty"),
    xlsxCellXml(`F${row}`, 6, null, "empty"),
  ];
  const warehousePrepareBlankMetaRow = (row) => [
    xlsxCellXml(`A${row}`, 6, null, "empty"),
    xlsxCellXml(`B${row}`, 6, null, "empty"),
    xlsxCellXml(`C${row}`, 5, null, "empty"),
    xlsxCellXml(`D${row}`, 6, null, "empty"),
    xlsxCellXml(`E${row}`, 5, null, "empty"),
    xlsxCellXml(`F${row}`, 6, null, "empty"),
  ];
  const emptyCells = (
    row,
    from = "A",
    to = WAREHOUSE_PREPARE_LAST_COL,
    style = 1,
  ) => {
    const cols = "ABCDEF".slice(
      "ABCDEF".indexOf(from),
      "ABCDEF".indexOf(to) + 1,
    );
    return cols
      .split("")
      .map((col) => xlsxCellXml(`${col}${row}`, style, null, "empty"));
  };
  pushRow(43.5, [
    xlsxCellXml("A1", 13, si("Бараа бэлдэж ачуулах хуудас"), "s"),
    ...emptyCells(1, "B", WAREHOUSE_PREPARE_LAST_COL, 13),
  ]);
  pushRow(
    28.5,
    warehousePrepareMetaRow(
      2,
      "Агуулахын ажилтан:",
      warehouseEmp,
      "Захиалгын огноо:",
      orderDateValue,
    ),
  );
  if (workerNames.length) {
    pushRow(
      20.25,
      warehousePrepareMetaRow(
        3,
        "Захиалга авсан ажилтан:",
        workerNames[0],
        "Хэвлэсэн огноо:",
        printedDateValue,
      ),
    );
    for (let i = 1; i < workerNames.length; i += 1) {
      pushRow(16.5, warehousePrepareWorkerExtraRow(rowNum, workerNames[i]));
    }
  } else {
    pushRow(
      20.25,
      warehousePrepareMetaRow(
        3,
        "Захиалга авсан ажилтан:",
        "-",
        "Хэвлэсэн огноо:",
        printedDateValue,
      ),
    );
  }
  pushRow(16.5, warehousePrepareBlankMetaRow(rowNum));
  const headerRow = rowNum;
  pushRow(30.75, [
    xlsxCellXml(`A${headerRow}`, 7, si("Барааны нэр төрөл"), "s"),
    xlsxCellXml(`B${headerRow}`, 7, si("Хэмжих нэгж"), "s"),
    xlsxCellXml(`C${headerRow}`, 7, si("Баркод"), "s"),
    xlsxCellXml(`D${headerRow}`, 7, si("Багц"), "s"),
    xlsxCellXml(`E${headerRow}`, 7, si("Ширхэг"), "s"),
    xlsxCellXml(`F${headerRow}`, 7, si("Үлдэгдэл"), "s"),
  ]);
  const pushPrepareGroups = (groups) => {
    for (const item of groups) {
      if (item.type === "cat") {
        const r = rowNum;
        const catHeight =
          WAREHOUSE_PREPARE_CAT_HEIGHTS[
            Math.min(catIndex, WAREHOUSE_PREPARE_CAT_HEIGHTS.length - 1)
          ];
        catIndex += 1;
        merges.push(`A${r}:${WAREHOUSE_PREPARE_LAST_COL}${r}`);
        pushRow(catHeight, [
          xlsxCellXml(`A${r}`, 15, si(item.name), "s"),
          ...emptyCells(r, "B", WAREHOUSE_PREPARE_LAST_COL, 15),
        ]);
        continue;
      }
      const p = item.product;
      const { packs, pieces } = pickerQtyToParts(item.qty, p);
      const r = rowNum;
      pushRow(15, [
        xlsxCellXml(`A${r}`, 8, si(p.name || ""), "s"),
        xlsxCellXml(`B${r}`, 8, si(p.unit || "ширхэг"), "s"),
        xlsxBarcodeCell(`C${r}`, 9, p.barcode, si),
        xlsxOptionalNum(`D${r}`, 10, packs),
        xlsxOptionalNum(`E${r}`, 10, pieces),
        xlsxCellXml(`F${r}`, 8, Number(p.stock) || 0, "n"),
      ]);
    }
  };
  pushPrepareGroups(sections.regular);
  if (sections.promo.length) {
    const promoHeadRow = rowNum;
    merges.push(
      `A${promoHeadRow}:${WAREHOUSE_PREPARE_LAST_COL}${promoHeadRow}`,
    );
    pushRow(27.75, [
      xlsxCellXml(`A${promoHeadRow}`, 15, si(PROMO_PRODUCT_LABEL), "s"),
      ...emptyCells(promoHeadRow, "B", WAREHOUSE_PREPARE_LAST_COL, 15),
    ]);
    pushPrepareGroups(sections.promo);
  }
  pushRow(null, emptyCells(rowNum, "A", WAREHOUSE_PREPARE_LAST_COL, 2));
  pushRow(16.5, emptyCells(rowNum, "A", WAREHOUSE_PREPARE_LAST_COL, 2));
  const pushWarehousePrepareSignatureBlock = (role) => {
    const nameRow = rowNum;
    merges.push(`C${nameRow}:F${nameRow}`);
    pushRow(18, [
      xlsxCellXml(`A${nameRow}`, 3, si(role), "s"),
      xlsxCellXml(`B${nameRow}`, 4, si("Нэр"), "s"),
      xlsxCellXml(`C${nameRow}`, 17, null, "empty"),
      xlsxCellXml(`D${nameRow}`, 17, null, "empty"),
      xlsxCellXml(`E${nameRow}`, 17, null, "empty"),
      xlsxCellXml(`F${nameRow}`, 17, null, "empty"),
    ]);
    pushRow(8.25, emptyCells(rowNum, "A", WAREHOUSE_PREPARE_LAST_COL, 2));
    const signRow = rowNum;
    merges.push(`C${signRow}:F${signRow}`);
    pushRow(18, [
      xlsxCellXml(`A${signRow}`, 12, null, "empty"),
      xlsxCellXml(`B${signRow}`, 4, si("Гарын үсэг"), "s"),
      xlsxCellXml(`C${signRow}`, 17, null, "empty"),
      xlsxCellXml(`D${signRow}`, 17, null, "empty"),
      xlsxCellXml(`E${signRow}`, 17, null, "empty"),
      xlsxCellXml(`F${signRow}`, 17, null, "empty"),
    ]);
  };
  pushWarehousePrepareSignatureBlock("Хүлээлгэн өгсөн ажилтан:");
  pushRow(16.5, emptyCells(rowNum, "A", WAREHOUSE_PREPARE_LAST_COL, 2));
  pushWarehousePrepareSignatureBlock("Хүлээн авсан ажилтан:");
  const lastRow = rowNum;
  const mergeXml = merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${WAREHOUSE_PREPARE_LAST_COL}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols><col min="1" max="1" width="25.125" customWidth="1"/><col min="2" max="2" width="12.75" customWidth="1"/><col min="3" max="3" width="13.75" customWidth="1"/><col min="4" max="4" width="7.375" customWidth="1"/><col min="5" max="5" width="8.125" customWidth="1"/><col min="6" max="6" width="14.625" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${mergeXml}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sharedStringsXml: xlsxSharedStringsXml(strings), sheetXml };
}
async function exportWarehousePrepareExcelXlsx(orders, workerIds) {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const { sharedStringsXml, sheetXml } = buildWarehousePrepareSheetXml(
    orders,
    workerIds,
  );
  const tpl = await fetch(staticAssetUrl(WAREHOUSE_PREPARE_TEMPLATE)).then(
    (r) => {
      if (!r.ok) throw new Error("template missing");
      return r.arrayBuffer();
    },
  );
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  zip.file("xl/styles.xml", warehousePrepareStylesXml());
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, `aguulah-beldeh-${stamp}.xlsx`);
}
function exportWarehousePrepareExcelFallback(orders, workerIds) {
  const stamp = new Date().toISOString().slice(0, 10);
  const warehouseEmp = state.currentEmployee?.name || "-";
  const orderDateText = `Захиалгын огноо:${warehouseSheetDateValue(state.filters.warehouseDate || todayIso())}`;
  const printedDateText = `Хэвлэсэн огноо:${warehouseSheetDateValue(todayIso())}`;
  const workerNames = state.employees
    .filter((e) => workerIds.includes(e.id))
    .map((e) => e.name);
  const sections = warehouseOrderPrepareSections(orders);
  const h = (value) => xlsxXmlEsc(value ?? "");
  const workerRows = workerNames.length
    ? workerNames
        .map(
          (name, idx) =>
            `<tr><td class="meta-label">${idx === 0 ? "Захиалга авсан ажилтан:" : ""}</td><td class="meta-value">${h(name)}</td>${idx === 0 ? `<td colspan="4" class="date">${h(printedDateText)}</td>` : "<td></td><td></td><td></td><td></td>"}</tr>`,
        )
        .join("")
    : `<tr><td class="meta-label">Захиалга авсан ажилтан:</td><td class="meta-value">-</td><td colspan="4" class="date">${h(printedDateText)}</td></tr>`;
  const renderGroupRows = (groups) =>
    groups
      .map((item) => {
        if (item.type === "cat") {
          return `<tr><td colspan="6" class="cat">${h(item.name)}</td></tr>`;
        }
        const p = item.product;
        const { packs, pieces } = pickerQtyToParts(item.qty, p);
        return `<tr><td>${h(p.name || "")}</td><td>${h(p.unit || "ширхэг")}</td><td class="barcode">${h(p.barcode || "")}</td><td class="num">${packs || ""}</td><td class="num">${pieces || ""}</td><td class="num">${Number(p.stock) || 0}</td></tr>`;
      })
      .join("");
  const promoRows = sections.promo.length
    ? `<tr><td colspan="6" class="cat promo-head">${PROMO_PRODUCT_LABEL}</td></tr>${renderGroupRows(sections.promo)}`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: Arial, sans-serif; color: #000; }
table.prepare { width: 1000px; border-collapse: collapse; table-layout: fixed; font-size: 20px; }
.prepare col:nth-child(1) { width: 345px; }
.prepare col:nth-child(2) { width: 125px; }
.prepare col:nth-child(3) { width: 205px; }
.prepare col:nth-child(4) { width: 70px; }
.prepare col:nth-child(5) { width: 80px; }
.prepare col:nth-child(6) { width: 175px; }
.prepare td, .prepare th { border: 1px solid #555; padding: 2px 4px; vertical-align: middle; }
.prepare td:first-child { overflow-wrap: anywhere; }
.title { height: 72px; text-align: center; font-size: 32px; font-weight: 800; }
.meta-label { text-align: right; font-weight: 700; white-space: nowrap; }
.meta-value { font-weight: 400; }
.date { text-align: center; font-size: 20px; }
.blank td { height: 30px; }
.head th { height: 52px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #000; }
.cat { text-align: center; font-weight: 800; height: 36px; }
.promo-head { border-top: 2px solid #000 !important; }
.barcode { mso-number-format:"\\@"; text-align: left; }
.num { text-align: right; }
.spacer td { height: 88px; }
.sign-label { text-align: right; font-weight: 700; }
.sign-line { border-bottom: 2px solid #000 !important; }
.sign-hint { text-align: left; font-size: 14px; border-top: none !important; }
.sign-gap td { height: 10px; border: none !important; }
.sign-block-gap td { height: 22px; border: none !important; }
</style></head><body><table class="prepare">
<colgroup><col><col><col><col><col><col></colgroup>
<tr><td colspan="6" class="title">Бараа бэлдэж ачуулах хуудас</td></tr>
<tr><td class="meta-label">Агуулахын ажилтан:</td><td class="meta-value">${h(warehouseEmp)}</td><td colspan="4" class="date">${h(orderDateText)}</td></tr>
${workerRows}
<tr class="blank"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr class="head"><th>Барааны нэр төрөл</th><th>Хэмжих нэгж</th><th>Баркод</th><th>Багц</th><th>Ширхэг</th><th>Үлдэгдэл</th></tr>
${renderGroupRows(sections.regular)}${promoRows}
<tr class="spacer"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td class="sign-label">Хүлээлгэн өгсөн ажилтан:</td><td class="sign-hint">Нэр</td><td colspan="4" class="sign-line"></td></tr>
<tr class="sign-gap"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td></td><td class="sign-hint">Гарын үсэг</td><td colspan="4" class="sign-line"></td></tr>
<tr class="sign-block-gap"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td class="sign-label">Хүлээн авсан ажилтан:</td><td class="sign-hint">Нэр</td><td colspan="4" class="sign-line"></td></tr>
<tr class="sign-gap"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td></td><td class="sign-hint">Гарын үсэг</td><td colspan="4" class="sign-line"></td></tr>
</table></body></html>`;
  downloadReceiptExcelBlob(`aguulah-beldeh-${stamp}.xls`, html);
}
function exportWarehousePrepareExcel(orders, workerIds) {
  return exportWarehousePrepareExcelXlsx(orders, workerIds)
    .then(() => showInstallToast("Мэдээлэл татагдлаа"))
    .catch((err) => {
      console.warn("Warehouse prepare xlsx failed", err);
      try {
        exportWarehousePrepareExcelFallback(orders, workerIds);
        showInstallToast("Мэдээлэл татагдлаа");
      } catch (fallbackErr) {
        console.warn("Warehouse prepare fallback failed", fallbackErr);
        alert("Мэдээлэл татахад алдаа гарлаа. Дахин оролдоно уу.");
        throw fallbackErr;
      }
    });
}
function exportCountExcelFallback() {
  const rows = countExcelRows();
  if (!rows.length) return alert("Тоолсон бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  const products = countExportProducts();
  const totals = countMetricsTotals(products);
  const mismatchCount = countMismatchesForList(products).length;
  excel(`toollogo-${stamp}.xlsx`, [
    ["Тооллогын тайлан"],
    [`Агуулахын ажилтан: ${state.currentEmployee?.name || "-"}`],
    [countSheetDateLabel()],
    [
      `Тоолсон: ${products.length} бараа · ${mismatchCount ? `Зөрүүтэй: ${mismatchCount}` : "Зөрүүгүй"} · Хүлээгдэж буй = Эхний + Орлого − Борлуулсан − Зарлагдсан · Зөрүү = Тоолсон − Бүртгэл`,
    ],
    [],
    [
      "Бараа",
      "Баркод",
      "Эхний үлдэгдэл",
      "Орлого",
      "Борлуулсан",
      "Зарлагдсан",
      "Хүлээгдэж буй",
      "Бүртгэл",
      "Тоолсон",
      "Зөрүү",
      "Өртөг үнэ",
      "Зөрүү дүн",
      "Нэгж",
    ],
    ...rows,
    [],
    [
      "Нийт (ш)",
      "",
      totals.opening,
      totals.income,
      totals.sold,
      totals.expended,
      totals.expected,
      totals.system,
      totals.final,
      "",
      "",
      "",
      "",
    ],
    [
      "Нийт (₮)",
      "",
      totals.openingValue,
      totals.incomeValue,
      totals.soldValue,
      totals.expendedValue,
      totals.expectedValue,
      totals.systemValue,
      totals.finalValue,
      "",
      "",
      totals.diffValue,
      "",
    ],
  ]);
}
function exportCountExcel() {
  if (!countExcelRows().length) return alert("Тоолсон бараа байхгүй");
  exportCountExcelXlsx().catch(() => exportCountExcelFallback());
}
function confirmCountExcel() {
  if (!state.countDone) return alert("Эхлээд тооллогоо дуусгана уу");
  if (!countExcelRows().length) return alert("Тоолсон бараа байхгүй");
  confirmDataExport("Мэдээлэл татах", exportCountExcel);
}
function confirmFinishCount() {
  if (!countSessionActive()) {
    return alert("Тоолсон тоо оруулна уу");
  }
  if (!Object.keys(state.countQty).some((id) => countValue(id) !== null)) {
    return alert("Тоолсон тоо оруулна уу");
  }
  confirmModal("Тооллого дуусгах", "Тооллогыг дуусгаж хадгалах уу?", {
    confirmLabel: "Дуусгах",
    onConfirm: finishCount,
  });
}
function finishCount() {
  if (!countSessionActive()) {
    return alert("Тоолсон тоо оруулна уу");
  }
  if (!Object.keys(state.countQty).some((id) => countValue(id) !== null)) {
    return alert("Тоолсон тоо оруулна уу");
  }
  state.countDone = true;
  render();
  showAppToast("Тооллого хадгалагдлаа", "success");
  criticalBackendSave();
  window.setTimeout(() => {
    if (state.currentView === "count" && state.countDone) pollBackendState();
  }, 600);
}
function resetCountSession() {
  startCountSession();
  render();
}
function confirmNewCount() {
  const hasData =
    state.countDone ||
    countSessionActive() ||
    Object.keys(state.countQty).some((id) => countValue(id) !== null);
  if (!hasData) {
    resetCountSession();
    return;
  }
  confirmModal(
    "Шинэ тооллого",
    "Одоогийн тооллогын бүх тоо, эхний үлдэгдэл дахин тооцогдож, шинээр эхэлнэ.",
    {
      confirmLabel: "Шинээр эхлүүлэх",
      danger: true,
      onConfirm: resetCountSession,
    },
  );
}
function setInventoryCategory(cat) {
  state.filters.inventoryCategory = cat;
  render();
  scrollAppMainToTop();
}
function setInventoryTab(tab) {
  if (tab !== "in") stopBarcodeScan();
  state.filters.inventory = tab;
  if (tab === "in") {
    state.stockInEmployeeId = defaultInventoryEmployeeId();
    ensureStockInSession();
  }
  if (tab === "out") {
    state.stockOutEmployeeId = defaultInventoryEmployeeId();
    ensureStockOutSession();
  }
  render();
  scrollAppMainToTop();
}
function reportOrdersFiltered() {
  const day = state.filters.reportDate || "";
  let list = retainedOrders(state.orders).filter(
    (o) => o.status !== "cancelled",
  );
  if (day) list = list.filter((o) => orderCreatedDay(o) === day);
  return list;
}
function reportDateFiltersHtml() {
  const day = state.filters.reportDate || "",
    live = !day,
    pickerDay = day || todayIso(),
    display = warehouseDateDisplayText(day),
    q = state.searches.reports || "";
  const filters = `${pageToolbarSearch({ focusKey: "reports", value: q, placeholder: "Нэр, баримт №-ээр хайх..." })}<div class="wh-date-filters wh-date-filters--reports"><button type="button" onclick="clearReportDate()" class="wh-date-filters__live${live ? " is-active" : ""}">Бүгд</button><label class="wh-date-filters__date app-input"><span class="wh-date-filters__date-value">${esc(display)}</span><svg class="wh-date-filters__date-icon ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v2M17 3v2M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg><input type="date" class="wh-date-filters__native app-input" value="${esc(pickerDay)}" onchange="setReportDate(this.value)" aria-label="Огноо сонгох"></label><span class="wh-date-filters__hint">${live ? "Бүх захиалга" : "Сонгосон өдрийн захиалга"}</span></div>`;
  return pageToolbarHtml({
    filters,
    actions: excelDownloadBtn("confirmReportExport()"),
  });
}
function clearReportDate() {
  state.filters.reportDate = "";
  render();
}
function setReportDate(day) {
  state.filters.reportDate = day || "";
  render();
}
function reportsView() {
  const orders = reportOrdersFiltered(),
    q = String(state.searches.reports || "").trim(),
    paymentOrders = orders.filter((o) => orderReceiptMatchesQuery(o, q)),
    total = orders.reduce((s, o) => s + orderAmount(o), 0),
    paid = orders
      .filter((o) => orderIsPaid(o))
      .reduce((s, o) => s + orderAmount(o), 0),
    unpaid = total - paid;
  const sales = state.employees
    .filter((e) => e.role === "sales")
    .map((e) => {
      const empOrders = orders.filter((o) => o.employeeId === e.id);
      const sum = empOrders.reduce((s, o) => s + orderAmount(o), 0);
      return {
        ...e,
        count: empOrders.length,
        sum,
        commission: (sum * e.commissionRate) / 100,
      };
    });
  return `<div class="space-y-4">${pageHead("Борлуулалтын тайлан")}${reportDateFiltersHtml()}${metricsBar(`${card("Борлуулалт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(unpaid), "text-tone-danger")}`, 3)}<div class="line-panel"><div class="line-panel__section-title">Төлбөр${q ? ` · ${paymentOrders.length}` : ""}</div><div class="line-list">${reportPaymentListHtml(paymentOrders, q ? "Олдсонгүй" : "Захиалга байхгүй")}</div></div><div class="line-panel"><div class="line-panel__section-title">Тооцооны үлдэгдэл</div><div class="line-list">${sales.map((e, i) => `<div class="line-list__row line-list__row--static"><span>${i + 1}. ${e.name}</span><b>${fmt(e.sum)}</b></div>`).join("")}</div></div>`;
}
function paymentRow(o) {
  const paid = orderIsPaid(o),
    amount = orderAmount(o),
    term = paymentTermLabel(o.paymentTerm),
    actions = paid
      ? ""
      : `<button type="button" onclick="confirmSetPaid('${esc(o.id)}')" class="px-3 py-2 rounded text-sm bg-primary text-primary-foreground">Тооцоо дууссан</button>`;
  return `<div class="line-list__row line-list__row--static payment-row"><div class="payment-row__main"><div class="payment-row__title-row"><span class="payment-row__customer">${esc(o.customerName)}</span>${receiptNo(o, "xs")}</div><p class="line-list__meta">${esc(o.employeeName || "-")} · ${term} · Хүргэлт ${dte(orderDeliveryDay(o))}</p></div><b class="line-list__amount">${fmt(amount)}</b><span class="text-sm font-medium ${paid ? "text-tone-success" : "text-tone-danger"}">${paid ? "Тооцоо дууссан" : "Төлөөгүй"}</span><div class="payment-row__actions">${actions}</div></div>`;
}
function confirmSetPaid(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o || orderIsPaid(o)) return;
  confirmModal("Төлбөр баталгаажуулах", "Тооцоо дууссаныг баталгаажуулах уу?", {
    confirmLabel: "Тийм",
    onConfirm: () => setPaid(id, true),
  });
}
const PROMO_PRODUCT_LABEL = "Урамшууллын бараа";
const PROMO_PERCENT_TAB_LABEL = "Хөнгөлөх хувь";
const PROMO_PAYMENT_LABEL = "Шууд төлөлтийн урамшуулал оруулах";
const PROMO_QUANTITY_LABEL = "Багц худалдан авалтын хөнгөлөлт";
function promoProductQtyLabel(qty) {
  return `${Number(qty) || 1} ш · ${PROMO_PRODUCT_LABEL}`;
}
function promotionTypeLabel(type) {
  return (
    {
      quantity: PROMO_QUANTITY_LABEL,
      price: "Нийт үнийн дүнгээс хөнгөлөлт олгох",
      payment: PROMO_PAYMENT_LABEL,
    }[type] || "Урамшуулал"
  );
}
function promotionMenuHtml() {
  const items = [
    ["price", "Нийт үнийн дүнгээс хөнгөлөлт олгох"],
    ["quantity", PROMO_QUANTITY_LABEL],
    ["payment", PROMO_PAYMENT_LABEL],
  ];
  return `<nav class="admin-menu promo-type-menu" aria-label="Урамшууллын төрөл">${items
    .map(([id, label]) => {
      const count = (state.promotionRules[id] || []).length;
      const badge = count
        ? `<span class="promo-type-menu__count">${count}</span>`
        : "";
      return `<button type="button" onclick="openPromotionPage('${id}')" class="admin-menu__item promo-type-menu__item"><span class="promo-type-menu__label">${esc(label)}</span>${badge}</button>`;
    })
    .join("")}</nav>`;
}
function openPromotionPage(type) {
  if (!["price", "quantity", "payment"].includes(type)) return;
  state.filters.promotionTab = type;
  state.filters.promotionDetail = type;
  render();
  pushAppHistory();
}
function promotionsView() {
  const detail = state.filters.promotionDetail;
  if (!detail) {
    return `<div class="space-y-4">${pageHead("Урамшуулал")}${promotionMenuHtml()}</div>`;
  }
  const qty = state.promotionRules.quantity || [],
    price = state.promotionRules.price || [],
    payment = state.promotionRules.payment || [],
    panel =
      detail === "quantity"
        ? promotionQuantityPanel(qty)
        : detail === "payment"
          ? promotionPaymentPanel(payment)
          : promotionPricePanel(price);
  return `<div class="space-y-4">${pageHead(promotionTypeLabel(detail))}${panel}</div>`;
}
function productLabel(id) {
  return state.products.find((p) => p.id === id)?.name || "-";
}
function promotionSearchQtyRow(searchInputHtml, qtyOpts) {
  const qtyHtml = qtyOpts
    ? promotionQtyField(qtyOpts.name, qtyOpts.label, qtyOpts.defaultValue, true)
    : "";
  return qtyHtml
    ? `<div class="promo-input-row">${searchInputHtml}${qtyHtml}</div>`
    : `<div class="mb-2">${searchInputHtml}</div>`;
}
function promoFormDraftVal(name, fallback = "") {
  const v = state.promoFormDraft?.[name];
  return v !== undefined && v !== null ? String(v) : String(fallback ?? "");
}
function capturePromoFormDraft() {
  const form = document.querySelector("[data-promo-modal]");
  if (!form) return;
  state.promoFormDraft = state.promoFormDraft || {};
  form.querySelectorAll("input[name]").forEach((el) => {
    if (el.type === "hidden" || el.type === "checkbox") return;
    state.promoFormDraft[el.name] = el.value;
  });
}
function promoFormDraftField(el) {
  state.promoFormDraft = state.promoFormDraft || {};
  let v = el.value;
  if (el.dataset.promoDigits === "1" || el.type === "tel") {
    v = v.replace(/\D/g, "");
    if (el.value !== v) el.value = v;
  }
  state.promoFormDraft[el.name] = v;
}
function promoAmountInputHtml(
  name,
  { required = false, placeholder = "", value = "" } = {},
) {
  const req = required ? " required" : "";
  const v = String(value ?? "").trim();
  const valAttr = v ? ` value="${esc(v)}"` : "";
  return `<input name="${name}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-promo-digits="1"${req} placeholder="${esc(placeholder)}"${valAttr} oninput="promoFormDraftField(this)" class="w-full px-3 py-3 bg-secondary rounded app-input">`;
}
function jsStringArg(value) {
  return `'${esc(
    String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n"),
  )}'`;
}
function promoPickSearchKey(pickKey) {
  const map = {
    buyProductIds: "promo_buyProductIds",
    freeProductIds: "promo_freeProductIds",
    priceFreeProductIds: "promo_priceFreeProductIds",
    paymentFreeProductIds: "promo_paymentFreeProductIds",
  };
  return map[pickKey] || `promo_${pickKey}`;
}
function promoPickCategoryKey(pickKey) {
  return `${promoPickSearchKey(pickKey)}_category`;
}
function promoPickCategory(pickKey) {
  return state.searches[promoPickCategoryKey(pickKey)] || "all";
}
function promoFilteredProducts(pickKey, excludeIds = []) {
  const searchKey = promoPickSearchKey(pickKey),
    rawQ = (searchKey && state.searches[searchKey]) || "",
    q = rawQ.toLowerCase().trim(),
    category = promoPickCategory(pickKey),
    exclude = new Set(excludeIds.filter(Boolean));
  return state.products.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (category !== "all" && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.barcode || "").includes(q) ||
      String(p.category || "")
        .toLowerCase()
        .includes(q)
    );
  });
}
function promoCategoryFilterHtml(pickKey) {
  const active = promoPickCategory(pickKey);
  const btn = (value, label) =>
    `<button type="button" onclick="setPromoPickCategory(${jsStringArg(pickKey)},${jsStringArg(value)})" class="promo-category-chip ${active === value ? "is-active" : ""}">${esc(label)}</button>`;
  return `<div class="promo-category-scroll">${btn("all", "Бүх төрөл")}${cats()
    .map((cat) => btn(cat, cat))
    .join("")}</div>`;
}
function promoProductSearchListInnerHtml({
  pickKey,
  selectedIds = [],
  excludeIds = [],
  addAction,
  selectedId = "",
}) {
  const exclude = [...excludeIds, ...selectedIds].filter(Boolean),
    products = promoFilteredProducts(pickKey, exclude),
    shown = products.slice(0, 40),
    more = Math.max(0, products.length - shown.length);
  if (!shown.length) {
    return `<p class="promo-product-empty">Бараа олдсонгүй</p>`;
  }
  return `<div class="promo-product-list promo-product-list--search" data-promo-pick-list="${esc(pickKey)}">${shown
    .map((p) => {
      const onclick =
        addAction === "select"
          ? `selectPromoProduct(${jsStringArg(pickKey)},${jsStringArg(p.id)})`
          : `addPromoPickProduct(${jsStringArg(pickKey)},${jsStringArg(p.id)})`;
      return `<button type="button" onclick="${onclick}" class="promo-product-row ${selectedId === p.id ? "is-active" : ""}"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb" alt=""><div class="min-w-0 text-left"><p class="text-sm font-medium truncate">${esc(p.name)}</p><p class="text-xs text-muted-foreground">${esc(p.category)} · ${esc(p.barcode)}</p><p class="text-xs font-semibold text-primary mt-1">${fmt(p.price)} · үлд ${p.stock} ${esc(p.unit || "ш")}</p></div></button>`;
    })
    .join(
      "",
    )}${more ? `<p class="promo-product-more">+${more} бараа. Хайлтаа нарийсгана уу.</p>` : ""}</div>`;
}
function promoProductSearchListHtml(opts) {
  const pickKey = opts.pickKey,
    addAction = opts.addAction === "select" ? "select" : "add";
  return `<div data-promo-pick-list-mount="${esc(pickKey)}" data-promo-pick-action="${addAction}">${promoProductSearchListInnerHtml(opts)}</div>`;
}
function capturePromoPickListScroll() {
  const map = { ...(state.promoPickListScroll || {}) };
  document.querySelectorAll("[data-promo-pick-list]").forEach((el) => {
    const key = el.getAttribute("data-promo-pick-list");
    if (key) map[key] = el.scrollTop;
  });
  state.promoPickListScroll = map;
  return map;
}
function restorePromoPickListScroll(map, defer = true) {
  const snap = map || state.promoPickListScroll || {};
  const apply = () => {
    Object.entries(snap).forEach(([key, top]) => {
      if (top == null) return;
      const el = document.querySelector(`[data-promo-pick-list="${key}"]`);
      if (el) el.scrollTop = top;
    });
  };
  if (defer) requestAnimationFrame(apply);
  else apply();
}
function resetPromoPickListScroll(pickKey = "") {
  if (!pickKey) {
    state.promoPickListScroll = {};
    return;
  }
  state.promoPickListScroll = {
    ...(state.promoPickListScroll || {}),
    [pickKey]: 0,
  };
}
function patchPromoPickSearchList(pickKey, opts = {}) {
  const mount = document.querySelector(
    `[data-promo-pick-list-mount="${pickKey}"]`,
  );
  if (!mount) return false;
  const addAction =
    mount.getAttribute("data-promo-pick-action") === "select"
      ? "select"
      : "add";
  const pick = state.promoPick || {};
  const selectedIds = promotionPickIds(pick, pickKey);
  let selectedId = "";
  if (addAction === "select") {
    selectedId =
      document.querySelector(`#promo-${pickKey}`)?.value ||
      selectedIds[0] ||
      "";
  }
  const prevList = mount.querySelector("[data-promo-pick-list]");
  const prevScroll =
    opts.scrollTop != null
      ? opts.scrollTop
      : (prevList?.scrollTop ?? state.promoPickListScroll?.[pickKey] ?? 0);
  mount.innerHTML = promoProductSearchListInnerHtml({
    pickKey,
    selectedIds,
    excludeIds: [],
    addAction,
    selectedId,
  });
  if (opts.preserveScroll !== false) {
    const next = mount.querySelector("[data-promo-pick-list]");
    if (next) next.scrollTop = prevScroll;
    state.promoPickListScroll = {
      ...(state.promoPickListScroll || {}),
      [pickKey]: prevScroll,
    };
  } else {
    state.promoPickListScroll = {
      ...(state.promoPickListScroll || {}),
      [pickKey]: 0,
    };
  }
  return true;
}
function promotionProductPickerBlock(
  fieldName,
  title,
  selectedId = "",
  opts = null,
) {
  const variant = opts?.variant || "",
    excludeRaw = opts?.excludeIds || opts?.excludeId || "",
    excludeIds = new Set(
      (Array.isArray(excludeRaw) ? excludeRaw : [excludeRaw]).filter(Boolean),
    ),
    placeholder = opts?.placeholder || "Нэр, баркод бичээд хайна уу...",
    hint = opts?.hint || "",
    searchKey = promoPickSearchKey(fieldName),
    rawQ = state.searches[searchKey] || "",
    selected = state.products.find((p) => p.id === selectedId),
    duplicate = selectedId && excludeIds.has(selectedId),
    selectedHtml = selected
      ? `<div class="promo-product-list promo-product-list--selected">${promotionProductPickRow(selected, fieldName, selectedId)}</div>`
      : "",
    listHtml = promoProductSearchListHtml({
      pickKey: fieldName,
      excludeIds: [...excludeIds],
      addAction: "select",
      selectedId,
    }),
    searchInput = `<input data-promo-pick="${fieldName}" value="${esc(rawQ)}" oninput="promoProductSearch('${fieldName}',this.value)" placeholder="${esc(placeholder)}" class="promo-search-input px-3 py-2 bg-secondary rounded text-sm">`,
    inputRow = promotionSearchQtyRow(searchInput, opts?.qty || null),
    badge = variant === "buy" ? "1" : variant === "free" ? "2" : "",
    head = badge
      ? `<div class="promo-section-head"><span class="promo-section-badge">${badge}</span><div><p class="promo-section-title">${title}</p>${hint ? `<p class="promo-section-hint">${hint}</p>` : ""}</div></div>`
      : `<span class="block text-sm font-medium mb-2">${title}</span>`,
    warn = duplicate
      ? `<p class="promo-section-warn">Энэ барааг аль хэдийн нөгөө талд сонгосон байна. Өөр бараа сонгоно уу.</p>`
      : "";
  return `<div class="promo-section${variant ? ` promo-section--${variant}` : ""}"><div class="promo-product-block"><input type="hidden" name="${fieldName}" id="promo-${fieldName}" value="${esc(selectedId)}" required>${head}${inputRow}${promoCategoryFilterHtml(fieldName)}${warn}${selectedHtml}${listHtml}</div></div>`;
}
function promoSectionArrow() {
  return `<div class="promo-section-arrow" aria-hidden="true"><span class="promo-section-arrow-icon"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg></span><span class="promo-section-arrow-text">${PROMO_PRODUCT_LABEL}</span></div>`;
}
function promotionQtyField(name, label, defaultValue, inline = false) {
  const draftVal = promoFormDraftVal(name, "");
  const val = draftVal !== "" ? ` value="${esc(draftVal)}"` : "";
  const ph =
    defaultValue !== undefined && defaultValue !== ""
      ? String(defaultValue)
      : "1";
  const cls = inline
    ? "promo-qty-field promo-qty-field--inline"
    : "promo-qty-field";
  const wrap = inline ? "" : `<div class="promo-qty-inline">`;
  const wrapEnd = inline ? "" : `</div>`;
  const labelHtml = inline
    ? ""
    : `<span class="block text-xs text-muted-foreground mb-1">${label}</span>`;
  const aria = inline ? ` aria-label="${label}"` : "";
  return `${wrap}<label class="${cls}">${labelHtml}<input name="${name}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-promo-digits="1" required${val} placeholder="${esc(ph)}"${aria} oninput="promoFormDraftField(this)" class="promo-qty-input bg-secondary rounded"></label>${wrapEnd}`;
}
function promotionProductPickRow(p, fieldName, selectedId) {
  const active = selectedId === p.id;
  return `<button type="button" onclick="selectPromoProduct('${fieldName}','${p.id}')" class="promo-product-row ${active ? "is-active" : ""}"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb" alt=""><div class="min-w-0 text-left"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · ${p.barcode}</p><p class="text-xs font-semibold text-primary mt-1">${fmt(p.price)} · үлд ${p.stock} ${p.unit}</p></div></button>`;
}
function promotionBuyProductIds(rule) {
  if (Array.isArray(rule.buyProductIds) && rule.buyProductIds.length) {
    return rule.buyProductIds.filter(Boolean);
  }
  if (rule.buyProductId) return [rule.buyProductId];
  return [];
}
function promotionFreeProductIds(rule) {
  if (!rule || typeof rule !== "object") return [];
  if (Array.isArray(rule.freeProductIds) && rule.freeProductIds.length) {
    return rule.freeProductIds.filter(Boolean);
  }
  // Legacy / alternate keys used by price & payment forms.
  if (
    Array.isArray(rule.priceFreeProductIds) &&
    rule.priceFreeProductIds.length
  ) {
    return rule.priceFreeProductIds.filter(Boolean);
  }
  if (
    Array.isArray(rule.paymentFreeProductIds) &&
    rule.paymentFreeProductIds.length
  ) {
    return rule.paymentFreeProductIds.filter(Boolean);
  }
  if (rule.freeProductId) return [rule.freeProductId];
  if (rule.priceFreeProductId) return [rule.priceFreeProductId];
  if (rule.paymentFreeProductId) return [rule.paymentFreeProductId];
  return [];
}
function normalizePromotionRuleShape(rule) {
  if (!rule || typeof rule !== "object") return rule;
  const freeIds = promotionFreeProductIds(rule);
  if (!freeIds.length) return rule;
  if (
    Array.isArray(rule.freeProductIds) &&
    rule.freeProductIds.length === freeIds.length
  ) {
    return rule;
  }
  return {
    ...rule,
    freeProductIds: freeIds,
    freeProductId: freeIds[0],
  };
}
function normalizePromotionRulesState(rules = {}) {
  const next = {
    quantity: Array.isArray(rules.quantity) ? rules.quantity : [],
    price: Array.isArray(rules.price) ? rules.price : [],
    payment: Array.isArray(rules.payment) ? rules.payment : [],
  };
  for (const kind of ["quantity", "price", "payment"]) {
    next[kind] = dedupePromotionRuleList(
      next[kind].map(normalizePromotionRuleShape),
    );
  }
  return next;
}
function promotionPickIds(pick, key) {
  const raw = pick?.[key];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (key === "freeProductIds" && pick?.freeProductId)
    return [pick.freeProductId];
  if (key === "priceFreeProductIds" && pick?.priceFreeProductId) {
    return [pick.priceFreeProductId];
  }
  if (key === "paymentFreeProductIds" && pick?.paymentFreeProductId) {
    return [pick.paymentFreeProductId];
  }
  return [];
}
function promotionProductLabels(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => productLabel(id))
    .filter(Boolean)
    .join(", ");
}
function promotionMultiProductPickerBlock({
  pickKey,
  fieldName,
  selectedIds,
  excludeIds = [],
  title,
  hint,
  placeholder,
  variant = "",
  badge = "",
  qty = null,
}) {
  const ids = Array.isArray(selectedIds) ? selectedIds : [],
    exclude = new Set([...excludeIds, ...ids].filter(Boolean)),
    searchKey = promoPickSearchKey(pickKey),
    rawQ = (searchKey && state.searches[searchKey]) || "",
    selectedProducts = ids
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    selectedHtml = selectedProducts.length
      ? `<div class="promo-product-list promo-product-list--selected">${selectedProducts.map((p) => `<div class="promo-product-row promo-product-row--selected"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb" alt=""><div class="min-w-0 flex-1"><p class="text-sm font-medium truncate">${esc(p.name)}</p><p class="text-xs text-muted-foreground">${esc(p.category)}</p></div><button type="button" onclick="removePromoPickProduct(${jsStringArg(pickKey)},${jsStringArg(p.id)})" class="promo-product-row__remove" aria-label="Хасах">×</button></div>`).join("")}</div>`
      : `<p class="promo-section-hint">Хайлтаар бараа нэмнэ</p>`,
    searchHtml = promoProductSearchListHtml({
      pickKey,
      selectedIds: ids,
      excludeIds: [...exclude],
      addAction: "add",
    }),
    hiddenInputs = ids
      .map(
        (id) => `<input type="hidden" name="${fieldName}" value="${esc(id)}">`,
      )
      .join(""),
    searchInput = `<input data-promo-pick="${pickKey}" value="${esc(rawQ)}" oninput="promoPickSearch('${pickKey}',this.value)" placeholder="${esc(placeholder)}" class="promo-search-input px-3 py-2 bg-secondary rounded text-sm">`,
    head = badge
      ? `<div class="promo-section-head"><span class="promo-section-badge">${badge}</span><div><p class="promo-section-title">${title}</p>${hint ? `<p class="promo-section-hint">${hint}</p>` : ""}</div></div>`
      : `<span class="block text-sm font-medium mb-2">${title}</span>`;
  return `<div class="promo-section${variant ? ` promo-section--${variant}` : ""}"><div class="promo-product-block">${hiddenInputs}${head}${promotionSearchQtyRow(searchInput, qty)}${promoCategoryFilterHtml(pickKey)}${selectedHtml}${searchHtml}</div></div>`;
}
function promotionMultiBuyPickerBlock(selectedIds) {
  return promotionMultiProductPickerBlock({
    pickKey: "buyProductIds",
    fieldName: "buyProductIds",
    selectedIds,
    excludeIds: [],
    title: "Сонгосон бараа",
    hint: "Олон бараа сонгож болно · нийт тоо шалгана",
    placeholder: "Бараа хайж нэмэх...",
    variant: "buy",
    badge: "1",
    qty: { name: "buyQty", label: "Ширхэг" },
  });
}
function promotionMultiFreePickerBlock({
  pickKey,
  fieldName,
  selectedIds,
  excludeIds = [],
  title,
  hint,
  placeholder,
  badge,
  qty,
}) {
  return promotionMultiProductPickerBlock({
    pickKey,
    fieldName,
    selectedIds,
    excludeIds,
    title,
    hint,
    placeholder,
    variant: "free",
    badge,
    qty,
  });
}
function promoPickSearch(pickKey, value) {
  const key = promoPickSearchKey(pickKey);
  if (!key) return;
  state.searches[key] = value;
  // Update only the product list so the search input keeps focus / keyboard.
  if (!patchPromoPickSearchList(pickKey, { preserveScroll: false })) {
    refreshPromoModal({ focusPickKey: pickKey });
  }
}
function setPromoPickCategory(pickKey, category) {
  state.searches[promoPickCategoryKey(pickKey)] = category || "all";
  resetPromoPickListScroll(pickKey);
  refreshPromoModal();
}
function promoBuyProductSearch(value) {
  promoPickSearch("buyProductIds", value);
}
function promoPickConflict(pickKey, id) {
  const pick = state.promoPick || {};
  const ids = promotionPickIds(pick, pickKey);
  if (ids.includes(id)) return "Энэ барааг аль хэдийн сонгосон байна.";
  return "";
}
function addPromoPickProduct(pickKey, id) {
  const conflict = promoPickConflict(pickKey, id);
  if (conflict) return alert(conflict);
  const pick = state.promoPick || {},
    ids = [...promotionPickIds(pick, pickKey)];
  const idStr = String(id || "").trim();
  if (!idStr || ids.includes(idStr)) return;
  state.promoPick = { ...pick, [pickKey]: [...ids, idStr] };
  const searchKey = promoPickSearchKey(pickKey);
  if (searchKey) state.searches[searchKey] = "";
  refreshPromoModal({ focusPickKey: pickKey });
}
function removePromoPickProduct(pickKey, id) {
  const pick = state.promoPick || {},
    ids = promotionPickIds(pick, pickKey).filter((x) => x !== id);
  state.promoPick = { ...pick, [pickKey]: ids };
  refreshPromoModal({ focusPickKey: pickKey });
}
function addPromoBuyProduct(id) {
  addPromoPickProduct("buyProductIds", id);
}
function removePromoBuyProduct(id) {
  removePromoPickProduct("buyProductIds", id);
}
function promoProductSearch(fieldName, value) {
  promoPickSearch(fieldName, value);
}
function refreshPromoModal(opts = {}) {
  const scrollEl = modal.querySelector(".modal-scroll");
  const listScroll = capturePromoPickListScroll();
  const scrollSnap = {
    top: scrollEl?.scrollTop ?? 0,
    pickKey: opts.focusPickKey || "",
    listScroll,
  };
  capturePromoFormDraft();
  if (state.promoModalKind === "price") promotionPriceModal();
  else if (state.promoModalKind === "payment") promotionPaymentModal();
  else promotionQtyModal();
  requestAnimationFrame(() => {
    const nextScroll = modal.querySelector(".modal-scroll");
    if (nextScroll) nextScroll.scrollTop = scrollSnap.top;
    restorePromoPickListScroll(scrollSnap.listScroll, false);
    if (scrollSnap.pickKey) {
      const el = document.querySelector(
        `[data-promo-pick="${scrollSnap.pickKey}"]`,
      );
      if (el) {
        el.focus({ preventScroll: true });
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  });
}
function selectPromoProduct(fieldName, id) {
  addPromoPickProduct(fieldName, id);
}
function promotionQtyRuleText(r) {
  const buyIds = promotionBuyProductIds(r),
    freeIds = promotionFreeProductIds(r);
  if (buyIds.length && freeIds.length) {
    const buyNames = promotionProductLabels(buyIds),
      freeNames = promotionProductLabels(freeIds);
    return `${buyNames}-аас нийт ${r.buyQty} ш авахад → ${freeNames} ${promoProductQtyLabel(r.freeQty)}`;
  }
  return `${r.minQty || 0} ширхэг · ${r.discountPercent || 0}% (хуучин дүрэм)`;
}
function promotionQuantityPanel(rows) {
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Багцад хамаарах ${PROMO_PRODUCT_LABEL} сонгох</p><button onclick="openPromotionQtyModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => promotionQtyRuleCard(r, i)).join("") : `<div class="p-6 text-sm text-muted-foreground">${PROMO_QUANTITY_LABEL}-ийн дүрэм байхгүй</div>`}</div></div>`;
}
function promotionQtyRuleCard(r, i) {
  const buyIds = promotionBuyProductIds(r),
    buyProducts = buyIds
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    freeProducts = promotionFreeProductIds(r)
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    buyLabel =
      buyProducts.length > 2
        ? `${buyProducts
            .slice(0, 2)
            .map((p) => p.name)
            .join(", ")} +${buyProducts.length - 2}`
        : buyProducts.map((p) => p.name).join(", ") || "-",
    freeLabel =
      freeProducts.length > 2
        ? `${freeProducts
            .slice(0, 2)
            .map((p) => p.name)
            .join(", ")} +${freeProducts.length - 2}`
        : freeProducts.map((p) => p.name).join(", ") || "-",
    buyThumbs = buyProducts
      .slice(0, 3)
      .map(
        (p) =>
          `<img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb promo-qty-rule-thumb" alt="">`,
      )
      .join(""),
    freeThumbs = freeProducts
      .slice(0, 3)
      .map(
        (p) =>
          `<img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb promo-qty-rule-thumb" alt="">`,
      )
      .join("");
  return `<div class="promo-qty-rule-card"><div class="promo-qty-rule-card__body"><div class="promo-qty-rule-buys">${buyThumbs}</div><div class="promo-qty-rule-card__buy min-w-0"><p class="text-xs text-muted-foreground">Дүрэм ${i + 1}</p><p class="font-medium truncate">${esc(buyLabel)}</p><p class="text-muted-foreground">нийт ${r.buyQty} ш авахад</p></div><span class="promo-qty-rule-card__arrow text-muted-foreground">→</span><div class="promo-qty-rule-buys">${freeThumbs}</div><div class="promo-qty-rule-card__free min-w-0"><p class="font-medium truncate">${esc(freeLabel)}</p><p class="text-tone-success">${promoProductQtyLabel(r.freeQty)}</p></div></div>${canDelete() ? `<div class="promo-qty-rule-card__actions">${deleteIconButton({ className: "icon-action-btn icon-action-btn--neutral", attrs: `onclick="confirmRemovePromotionRule('quantity',${i})"`, label: "Дүрэм устгах" })}</div>` : ""}</div>`;
}
function promotionPriceRuleText(r) {
  if (r.minAmount == null && r.discountPercent && !r.freeProductId) {
    return `${r.category ? "Ангилал: " + r.category + " · " : "Бүх ангилал · "}${r.discountPercent}% (хуучин дүрэм)`;
  }
  const min = fmt(Number(r.minAmount) || 0),
    max = Number(r.maxAmount) > 0 ? fmt(Number(r.maxAmount)) : "",
    range = max ? `${min} – ${max}` : `${min}-с дээш`;
  if (
    r.type === "percent" ||
    (r.discountPercent && !promotionFreeProductIds(r).length)
  ) {
    return `${range} · ${r.discountPercent}% хөнгөлөлт`;
  }
  const freeNames = promotionProductLabels(promotionFreeProductIds(r));
  return `${range} · ${freeNames || "-"} ${promoProductQtyLabel(r.freeQty)}`;
}
function promotionPricePanel(rows) {
  const sorted = [...rows].sort(
    (a, b) => (Number(a.minAmount) || 0) - (Number(b.minAmount) || 0),
  );
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Захиалгын нийт дүнгийн хүрээнд ${PROMO_PRODUCT_LABEL} эсвэл хувийн хөнгөлөлт олгон.</p><button onclick="openPromotionPriceModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${sorted.length ? sorted.map((r, i) => promotionPriceRuleCard(r, rows.indexOf(r))).join("") : `<div class="p-6 text-sm text-muted-foreground">Нийт үнийн дүнгийн хөнгөлөлтийн дүрэм байхгүй</div>`}</div></div>`;
}
function promotionPaymentRuleText(r) {
  const term = r.paymentTerm === "credit" ? "Зээлээр" : "Шууд төлөх",
    min = Number(r.minAmount) || 0,
    minText = min > 0 ? ` · ${fmt(min)}-с дээш` : "";
  if (
    r.type === "percent" ||
    (r.discountPercent && !promotionFreeProductIds(r).length)
  ) {
    return `${term}${minText} · ${r.discountPercent}% хөнгөлөлт`;
  }
  const freeNames = promotionProductLabels(promotionFreeProductIds(r));
  return `${term}${minText} · ${freeNames || "-"} ${promoProductQtyLabel(r.freeQty)}`;
}
function promotionPaymentPanel(rows) {
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Төлбөрийн нөхцлөөс хамаарах ${PROMO_PRODUCT_LABEL} сонгох</p><button onclick="openPromotionPaymentModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => promotionPaymentRuleCard(r, i)).join("") : `<div class="p-6 text-sm text-muted-foreground">Шууд төлбөрийн урамшууллын дүрэм байхгүй</div>`}</div></div>`;
}
function promotionPaymentRuleCard(r, i) {
  return `<div class="p-4 flex justify-between gap-3 text-sm"><div class="min-w-0"><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${promotionPaymentRuleText(r)}</p></div>${canDelete() ? deleteIconButton({ className: "icon-action-btn icon-action-btn--neutral shrink-0", attrs: `onclick="confirmRemovePromotionRule('payment',${i})"`, label: "Дүрэм устгах" }) : ""}</div>`;
}
function promotionPriceRuleCard(r, i) {
  return `<div class="p-4 flex justify-between gap-3 text-sm"><div class="min-w-0"><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${promotionPriceRuleText(r)}</p></div>${canDelete() ? deleteIconButton({ className: "icon-action-btn icon-action-btn--neutral shrink-0", attrs: `onclick="confirmRemovePromotionRule('price',${i})"`, label: "Дүрэм устгах" }) : ""}</div>`;
}
function openPromotionQtyModal() {
  state.promoModalKind = "qty";
  state.promoPick = { buyProductIds: [], freeProductIds: [] };
  state.promoFormDraft = {};
  resetPromoPickListScroll();
  state.searches.promo_buyProductIds = "";
  state.searches.promo_freeProductIds = "";
  state.searches.promo_buyProductIds_category = "all";
  state.searches.promo_freeProductIds_category = "all";
  promotionQtyModal();
}
function promotionQtyModal() {
  state.promoModalKind = "qty";
  state.promoPick = state.promoPick || {
    buyProductIds: [],
    freeProductIds: [],
  };
  if (!Array.isArray(state.promoPick.buyProductIds)) {
    state.promoPick.buyProductIds = state.promoPick.buyProductId
      ? [state.promoPick.buyProductId]
      : [];
  }
  if (!Array.isArray(state.promoPick.freeProductIds)) {
    state.promoPick.freeProductIds = promotionPickIds(
      state.promoPick,
      "freeProductIds",
    );
  }
  const buyIds = state.promoPick.buyProductIds,
    freeIds = state.promoPick.freeProductIds;
  box(
    PROMO_QUANTITY_LABEL,
    `<form data-promo-modal="qty" onsubmit="savePromotionQty(event)" class="p-5 flex flex-col max-h-[85vh]"><div class="modal-scroll overflow-y-auto space-y-3 flex-1">${promotionMultiBuyPickerBlock(buyIds)}${promoSectionArrow()}${promotionMultiFreePickerBlock({ pickKey: "freeProductIds", fieldName: "freeProductIds", selectedIds: freeIds, excludeIds: [], title: PROMO_PRODUCT_LABEL, hint: "Олон бараа сонгож болно · сонгосон бараатай ижил байж болно", placeholder: `${PROMO_PRODUCT_LABEL} хайж нэмэх...`, badge: "2", qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" } })}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function openPromotionPriceModal() {
  state.promoModalKind = "price";
  state.promoPriceRuleType = "free";
  state.promoPick = { priceFreeProductIds: [] };
  state.promoFormDraft = {};
  resetPromoPickListScroll();
  state.searches.promo_priceFreeProductIds = "";
  state.searches.promo_priceFreeProductIds_category = "all";
  promotionPriceModal();
}
function setPromotionPriceRuleType(type) {
  capturePromoFormDraft();
  state.promoPriceRuleType = type === "percent" ? "percent" : "free";
  promotionPriceModal();
}
function promotionPriceModal() {
  state.promoModalKind = "price";
  state.promoPick = state.promoPick || {};
  if (!Array.isArray(state.promoPick.priceFreeProductIds)) {
    state.promoPick.priceFreeProductIds = promotionPickIds(
      state.promoPick,
      "priceFreeProductIds",
    );
  }
  const type = state.promoPriceRuleType === "percent" ? "percent" : "free",
    freeIds = state.promoPick.priceFreeProductIds || [],
    typeToggle = `<div class="seg-tabs promo-type-tabs"><button type="button" onclick="setPromotionPriceRuleType('free')" class="seg-tab ${type === "free" ? "is-active" : ""}">${PROMO_PRODUCT_LABEL}</button><button type="button" onclick="setPromotionPriceRuleType('percent')" class="seg-tab ${type === "percent" ? "is-active" : ""}">${PROMO_PERCENT_TAB_LABEL}</button></div>`,
    amountFields = `<div class="grid grid-cols-2 gap-3"><label class="block"><span class="block text-sm font-medium mb-2">Доод дүн (₮)</span>${promoAmountInputHtml("minAmount", { required: true, placeholder: "200000", value: promoFormDraftVal("minAmount") })}</label><label class="block"><span class="block text-sm font-medium mb-2">Дээд дүн (₮)</span>${promoAmountInputHtml("maxAmount", { placeholder: "400000", value: promoFormDraftVal("maxAmount") })}<span class="text-xs text-muted-foreground mt-1 block">Хоосон = хязгааргүй</span></label></div>`,
    freeBlock =
      type === "free"
        ? promotionMultiFreePickerBlock({
            pickKey: "priceFreeProductIds",
            fieldName: "priceFreeProductIds",
            selectedIds: freeIds,
            title: PROMO_PRODUCT_LABEL,
            hint: "Олон бараа сонгож болно",
            placeholder: "Бараа хайж нэмэх...",
            qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" },
          })
        : "",
    percentBlock =
      type === "percent"
        ? `<label class="block"><span class="block text-sm font-medium mb-2">${PROMO_PERCENT_TAB_LABEL} (%)</span>${promoAmountInputHtml("discountPercent", { required: true, placeholder: "5", value: promoFormDraftVal("discountPercent") })}</label>`
        : "";
  box(
    "Нийт үнийн дүнгээс хөнгөлөлт олгох",
    `<form data-promo-modal="price" onsubmit="savePromotionPrice(event)" class="p-5 flex flex-col max-h-[85vh]"><input type="hidden" name="type" value="${type}"><div class="modal-scroll overflow-y-auto space-y-4 flex-1">${amountFields}${typeToggle}${freeBlock}${percentBlock}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function openPromotionPaymentModal() {
  state.promoModalKind = "payment";
  state.promoPaymentRuleType = "free";
  state.promoPaymentTerm = "cash";
  state.promoPick = { paymentFreeProductIds: [] };
  state.promoFormDraft = {};
  resetPromoPickListScroll();
  state.searches.promo_paymentFreeProductIds = "";
  state.searches.promo_paymentFreeProductIds_category = "all";
  promotionPaymentModal();
}
function setPromotionPaymentRuleType(type) {
  capturePromoFormDraft();
  state.promoPaymentRuleType = type === "percent" ? "percent" : "free";
  promotionPaymentModal();
}
function setPromotionPaymentTerm(term) {
  capturePromoFormDraft();
  state.promoPaymentTerm = term === "credit" ? "credit" : "cash";
  promotionPaymentModal();
}
function promotionPaymentModal() {
  state.promoModalKind = "payment";
  state.promoPick = state.promoPick || {};
  if (!Array.isArray(state.promoPick.paymentFreeProductIds)) {
    state.promoPick.paymentFreeProductIds = promotionPickIds(
      state.promoPick,
      "paymentFreeProductIds",
    );
  }
  const term = state.promoPaymentTerm === "credit" ? "credit" : "cash",
    type = state.promoPaymentRuleType === "percent" ? "percent" : "free",
    freeIds = state.promoPick.paymentFreeProductIds || [],
    termToggle = `<div class="seg-tabs"><button type="button" onclick="setPromotionPaymentTerm('cash')" class="seg-tab ${term === "cash" ? "is-active" : ""}">Шууд төлөх</button><button type="button" onclick="setPromotionPaymentTerm('credit')" class="seg-tab ${term === "credit" ? "is-active" : ""}">Зээлээр</button></div>`,
    typeToggle = `<div class="seg-tabs promo-type-tabs"><button type="button" onclick="setPromotionPaymentRuleType('free')" class="seg-tab ${type === "free" ? "is-active" : ""}">${PROMO_PRODUCT_LABEL}</button><button type="button" onclick="setPromotionPaymentRuleType('percent')" class="seg-tab ${type === "percent" ? "is-active" : ""}">Хувь тооцох</button></div>`,
    minField = `<label class="block"><span class="block text-sm font-medium mb-2">Доод дүн (₮)</span>${promoAmountInputHtml("minAmount", { placeholder: "0", value: promoFormDraftVal("minAmount") })}<span class="text-xs text-muted-foreground mt-1 block">Хоосон = хязгааргүй</span></label>`,
    freeBlock =
      type === "free"
        ? promotionMultiFreePickerBlock({
            pickKey: "paymentFreeProductIds",
            fieldName: "paymentFreeProductIds",
            selectedIds: freeIds,
            title: PROMO_PRODUCT_LABEL,
            hint: "Олон бараа сонгож болно",
            placeholder: "Бараа хайх...",
            qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" },
          })
        : "",
    percentBlock =
      type === "percent"
        ? `<label class="block"><span class="block text-sm font-medium mb-2">Хөнгөлөлтийн хувь (%)</span>${promoAmountInputHtml("discountPercent", { required: true, placeholder: "5", value: promoFormDraftVal("discountPercent") })}</label>`
        : "";
  box(
    PROMO_PAYMENT_LABEL,
    `<form data-promo-modal="payment" onsubmit="savePromotionPayment(event)" class="p-5 flex flex-col max-h-[85vh]"><input type="hidden" name="type" value="${type}"><input type="hidden" name="paymentTerm" value="${term}"><div class="modal-scroll overflow-y-auto space-y-4 flex-1">${termToggle}${minField}${typeToggle}${freeBlock}${percentBlock}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function savePromotionQty(e) {
  e.preventDefault();
  if (promotionSaveLock) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  promotionSaveLock = true;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const f = new FormData(form),
      buyProductIds = f.getAll("buyProductIds").filter(Boolean),
      freeProductIds = f.getAll("freeProductIds").filter(Boolean);
    // DOM refresh/scroll үед hidden inputs түр зуур хоосон уншигдах боломжтой.
    // Тийм үед state.promoPick-оос fallback хийж зөв хадгална.
    const pick = state.promoPick || {};
    const fallbackBuy = promotionPickIds(pick, "buyProductIds");
    const fallbackFree = promotionPickIds(pick, "freeProductIds");
    const finalBuyProductIds = buyProductIds.length
      ? buyProductIds
      : fallbackBuy;
    const finalFreeProductIds = freeProductIds.length
      ? freeProductIds
      : fallbackFree;
    if (!finalBuyProductIds.length || !finalFreeProductIds.length) {
      alert("Авах болон урамшууллын бараа сонгоно уу");
      return;
    }
    const added = appendPromotionRule("quantity", {
      buyProductIds: finalBuyProductIds,
      buyQty: Number(f.get("buyQty")),
      freeProductIds: finalFreeProductIds,
      freeProductId: finalFreeProductIds[0],
      freeQty: Number(f.get("freeQty")) || 1,
    });
    if (!added) return;
    finishPromotionSave("quantity");
  } finally {
    promotionSaveLock = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}
function matchingPricePromotionRule(gross) {
  let best = null;
  (state.promotionRules.price || []).forEach((r) => {
    if (r.minAmount == null) return;
    const min = Number(r.minAmount) || 0,
      max = Number(r.maxAmount) || 0;
    if (gross < min) return;
    if (max > 0 && gross > max) return;
    if (!best || min > (Number(best.minAmount) || 0)) best = r;
  });
  return best;
}
function pricePromotionDiscountAmount(gross, rule) {
  if (!rule) return 0;
  const isPercent =
    rule.type === "percent" ||
    (rule.discountPercent && !promotionFreeProductIds(rule).length);
  if (!isPercent) return 0;
  return Math.round((gross * Number(rule.discountPercent || 0)) / 100);
}
function appendPromoFreeLines(result, freeIds, freeQty, extra = {}) {
  const grant = Number(freeQty) || 1;
  (Array.isArray(freeIds) ? freeIds : []).forEach((freeId) => {
    const product = state.products.find((p) => p.id === freeId);
    if (!product) return;
    const existing = result.find(
      (l) => l.productId === freeId && l.isPromoFree,
    );
    if (existing) {
      existing.quantity += grant;
    } else {
      result.push({
        productId: freeId,
        productName: product.name,
        quantity: grant,
        price: 0,
        catalogPrice: Number(product.price ?? product.sellPrice ?? 0) || 0,
        total: 0,
        isPromoFree: true,
        ...extra,
      });
    }
  });
  return result;
}
function applyPricePromotions(lines, gross) {
  const rule = matchingPricePromotionRule(gross);
  if (!rule) return lines;
  const freeIds = promotionFreeProductIds(rule);
  const isFree =
    rule.type === "free" || (freeIds.length && !rule.discountPercent);
  if (!isFree) return lines;
  const result = lines.map((line) => ({ ...line }));
  return appendPromoFreeLines(result, freeIds, rule.freeQty, {
    isPricePromo: true,
  });
}
function matchingPaymentPromotionRule(gross, paymentTerm) {
  let best = null;
  (state.promotionRules.payment || []).forEach((r) => {
    if (r.paymentTerm !== paymentTerm) return;
    const min = Number(r.minAmount) || 0;
    if (gross < min) return;
    if (!best || min > (Number(best.minAmount) || 0)) best = r;
  });
  return best;
}
function paymentPromotionDiscountAmount(gross, rule) {
  if (!rule) return 0;
  const isPercent =
    rule.type === "percent" ||
    (rule.discountPercent && !promotionFreeProductIds(rule).length);
  if (!isPercent) return 0;
  return Math.round((gross * Number(rule.discountPercent || 0)) / 100);
}
function applyPaymentPromotions(lines, gross, paymentTerm) {
  const rule = matchingPaymentPromotionRule(gross, paymentTerm);
  if (!rule) return lines;
  const freeIds = promotionFreeProductIds(rule);
  const isFree =
    rule.type === "free" || (freeIds.length && !rule.discountPercent);
  if (!isFree) return lines;
  const result = lines.map((line) => ({ ...line }));
  return appendPromoFreeLines(result, freeIds, rule.freeQty, {
    isPaymentPromo: true,
  });
}
function workerPaidLines() {
  return state.products
    .map((p) => {
      const q = getWorkerQty(p.id);
      return q
        ? {
            productId: p.id,
            productName: p.name,
            quantity: q,
            price: p.price,
            total: p.price * q,
          }
        : null;
    })
    .filter(Boolean);
}
function workerPaidProductsInCart() {
  return state.products
    .map((p) => ({ ...p, qty: getWorkerQty(p.id) }))
    .filter((p) => p.qty > 0);
}
function applyQuantityPromotions(lines) {
  const result = lines.map((line) => ({ ...line }));
  const qtyByProduct = {};
  result.forEach((line) => {
    qtyByProduct[line.productId] =
      (qtyByProduct[line.productId] || 0) + line.quantity;
  });
  (state.promotionRules.quantity || []).forEach((rule) => {
    const buyIds = promotionBuyProductIds(rule),
      freeIds = promotionFreeProductIds(rule),
      buyQty = Number(rule.buyQty) || 0,
      freeQty = Number(rule.freeQty) || 1;
    if (!buyIds.length || !freeIds.length || buyQty < 1) return;
    const combinedQty = buyIds.reduce(
      (sum, id) => sum + (qtyByProduct[id] || 0),
      0,
    );
    const sets = Math.floor(combinedQty / buyQty);
    if (sets < 1) return;
    const grant = sets * freeQty;
    freeIds.forEach((freeId) => {
      const product = state.products.find((p) => p.id === freeId);
      if (!product) return;
      const existing = result.find(
        (l) => l.productId === freeId && l.isPromoFree,
      );
      if (existing) {
        existing.quantity += grant;
        existing.total = 0;
      } else {
        result.push({
          productId: freeId,
          productName: product.name,
          quantity: grant,
          price: 0,
          total: 0,
          isPromoFree: true,
        });
      }
    });
  });
  return result;
}
function workerOrderLines() {
  const paid = workerPaidLines(),
    gross = paid.reduce((s, l) => s + l.total, 0);
  return applyPaymentPromotions(
    applyPricePromotions(applyQuantityPromotions(paid), gross),
    gross,
    state.paymentTerm,
  );
}
function orderPromotionLines(paidItems, paymentTerm) {
  const paid = (paidItems || []).map((line) => ({ ...line })),
    gross = paid.reduce((s, l) => s + (Number(l.total) || 0), 0);
  return applyPaymentPromotions(
    applyPricePromotions(applyQuantityPromotions(paid), gross),
    gross,
    paymentTerm || "cash",
  ).filter((line) => line.isPromoFree);
}
function orderItemsWithPromos(o) {
  if (!o) return [];
  const items = (o.items || []).map((line) => ({ ...line })),
    paid = items.filter((line) => !line.isPromoFree),
    existingPromo = items.filter((line) => line.isPromoFree),
    existingPromoKeys = new Set(
      existingPromo.map((line) => String(line.productId || "")),
    ),
    generatedPromo = orderPromotionLines(paid, o.paymentTerm).filter(
      (line) => !existingPromoKeys.has(String(line.productId || "")),
    );
  return [...paid, ...existingPromo, ...generatedPromo];
}
function workerCartSummary() {
  const paid = workerPaidLines(),
    gross = paid.reduce((s, l) => s + l.total, 0),
    priceRule = matchingPricePromotionRule(gross),
    paymentRule = matchingPaymentPromotionRule(gross, state.paymentTerm),
    pricePromoDiscount = pricePromotionDiscountAmount(gross, priceRule),
    paymentPromoDiscount = paymentPromotionDiscountAmount(gross, paymentRule),
    all = workerOrderLines(),
    promo = all.filter((l) => l.isPromoFree),
    employeeDiscount = workerPercentDiscountActive()
      ? Math.round((gross * percentDiscountRate()) / 100)
      : 0,
    discount = Math.min(
      gross,
      employeeDiscount + pricePromoDiscount + paymentPromoDiscount,
    );
  return {
    paid,
    all,
    promo,
    gross,
    priceRule,
    paymentRule,
    pricePromoDiscount,
    paymentPromoDiscount,
    employeeDiscount,
    discount,
    total: gross - discount,
    skuCount: paid.length,
    pieceQty: all.reduce((s, l) => s + l.quantity, 0),
  };
}
function savePromotionPrice(e) {
  e.preventDefault();
  if (promotionSaveLock) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  promotionSaveLock = true;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const formData = new FormData(form),
      f = Object.fromEntries(formData),
      minAmount = Number(f.minAmount),
      maxAmount = Number(f.maxAmount) || 0;
    if (!Number.isFinite(minAmount) || minAmount < 0) {
      alert("Доод дүн оруулна уу");
      return;
    }
    if (maxAmount > 0 && maxAmount <= minAmount) {
      alert("Дээд дүн доод дүнээс их байх ёстой");
      return;
    }
    const type = f.type === "percent" ? "percent" : "free",
      rule = { minAmount, maxAmount, type };
    if (type === "free") {
      const freeProductIds = formData
        .getAll("priceFreeProductIds")
        .filter(Boolean);
      if (!freeProductIds.length) {
        alert(`${PROMO_PRODUCT_LABEL} сонгоно уу`);
        return;
      }
      rule.freeProductIds = freeProductIds;
      rule.freeProductId = freeProductIds[0];
      rule.freeQty = Number(f.freeQty) || 1;
    } else {
      const pct = Number(f.discountPercent);
      if (!pct || pct < 1 || pct > 100) {
        alert("Хөнгөлөлтийн хувь 1-100 хооронд байна");
        return;
      }
      rule.discountPercent = pct;
    }
    if (!appendPromotionRule("price", rule)) return;
    finishPromotionSave("price");
  } finally {
    promotionSaveLock = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}
function savePromotionPayment(e) {
  e.preventDefault();
  if (promotionSaveLock) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  promotionSaveLock = true;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const formData = new FormData(form),
      f = Object.fromEntries(formData),
      minAmount = f.minAmount === "" ? 0 : Number(f.minAmount);
    if (!Number.isFinite(minAmount) || minAmount < 0) {
      alert("Доод дүн зөв оруулна уу");
      return;
    }
    const type = f.type === "percent" ? "percent" : "free",
      rule = {
        paymentTerm: f.paymentTerm === "credit" ? "credit" : "cash",
        minAmount,
        type,
      };
    if (type === "free") {
      const freeProductIds = formData
        .getAll("paymentFreeProductIds")
        .filter(Boolean);
      if (!freeProductIds.length) {
        alert(`${PROMO_PRODUCT_LABEL} сонгоно уу`);
        return;
      }
      rule.freeProductIds = freeProductIds;
      rule.freeProductId = freeProductIds[0];
      rule.freeQty = Number(f.freeQty) || 1;
    } else {
      const pct = Number(f.discountPercent);
      if (!pct || pct < 1 || pct > 100) {
        alert("Хөнгөлөлтийн хувь 1-100 хооронд байна");
        return;
      }
      rule.discountPercent = pct;
    }
    if (!appendPromotionRule("payment", rule)) return;
    finishPromotionSave("payment");
  } finally {
    promotionSaveLock = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}
function removePromotionRule(type, index) {
  if (!requireAdminDelete()) return;
  if (!Array.isArray(state.promotionRules[type]))
    state.promotionRules[type] = [];
  if (index < 0 || index >= state.promotionRules[type].length) return;
  recordPromotionDeletion(type, state.promotionRules[type][index]);
  state.promotionRules[type].splice(index, 1);
  state.promotionRules[type] = dedupePromotionRuleList(
    state.promotionRules[type],
  );
  render();
  showAppToast(`${promotionTypeLabel(type)} дүрэм устгагдлаа`, "success");
  criticalBackendSave();
}
function confirmRemovePromotionRule(type, index) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
  const label = promotionTypeLabel(type);
  confirmModal(
    "Устгах уу?",
    `<b class="text-foreground">${label}</b> дүрмийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.`,
    {
      confirmLabel: "Устгах",
      onConfirm: () => removePromotionRule(type, index),
      danger: true,
    },
  );
}
function removePromotionRuleNow(type, index) {
  removePromotionRule(type, index);
  closeModal();
}
function employeePlaceholderImage(e = {}) {
  if (e?.image) return e.image;
  const initial = deliveryInitial(e.name);
  const hue =
    [...String(e?.name || "A")].reduce((s, ch) => s + ch.charCodeAt(0), 0) %
    360;
  const bg = `hsl(${hue} 48% 90%)`;
  const accent = `hsl(${hue} 58% 40%)`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" rx="14" fill="${bg}"/><text x="44" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="800" fill="${accent}">${initial}</text></svg>`)}`;
}
function employeeAvatarHtml(e, className = "employee-card__avatar") {
  const src = entityImageSrc(e?.image);
  if (src) {
    return `<img src="${esc(src)}" alt="" class="${className} employee-card__avatar-img" loading="lazy" decoding="async">`;
  }
  return `<span class="${className}" aria-hidden="true">${esc(deliveryInitial(e?.name))}</span>`;
}
function employeeImageField(e = {}) {
  const preview = e.image || employeePlaceholderImage(e);
  return `<div class="customer-image-field"><span class="block text-sm font-medium mb-2">Зураг</span><div class="customer-image-upload customer-image-upload--stack"><img id="employeeImagePreview" src="${preview}" alt="" class="customer-image-upload__preview"><div class="customer-image-upload__body"><input id="employeeImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/*" onchange="handleEmployeeImage(this)" hidden><div class="customer-image-upload__actions"><button type="button" onclick="document.getElementById('employeeImageFile').click()" class="btn btn--primary btn--sm customer-image-upload__pick">Зураг оруулах</button>${e.image ? `<button type="button" onclick="clearEmployeeImage()" class="btn btn--secondary btn--sm">Зураг арилгах</button>` : ""}</div><input id="employeeImageValue" name="image" type="hidden" value=""><p class="customer-image-upload__hint">Ажилтны зураг оруулна. JPG, PNG, WEBP.</p></div></div></div>`;
}
function initEmployeeImageField(e = {}) {
  const value = document.getElementById("employeeImageValue"),
    preview = document.getElementById("employeeImagePreview");
  const src = entityImageSrc(e?.image) || employeePlaceholderImage(e);
  if (value) value.value = e?.image || "";
  if (preview) preview.src = src;
}
function handleEmployeeImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  employeeImageCompressTask = compressImageFile(file)
    .then((dataUrl) => {
      const value = document.getElementById("employeeImageValue"),
        preview = document.getElementById("employeeImagePreview");
      if (value) value.value = dataUrl;
      if (preview) preview.src = dataUrl;
      const removeBtn = input
        .closest(".customer-image-upload__actions")
        ?.querySelector('[onclick="clearEmployeeImage()"]');
      if (!removeBtn) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--secondary btn--sm";
        btn.textContent = "Зураг арилгах";
        btn.onclick = clearEmployeeImage;
        input.closest(".customer-image-upload__actions")?.appendChild(btn);
      }
    })
    .catch((error) => {
      console.warn("Employee image compress failed", error);
      alert("Зураг уншиж чадсангүй");
    })
    .finally(() => {
      employeeImageCompressTask = null;
    });
}
function clearEmployeeImage() {
  const value = document.getElementById("employeeImageValue"),
    preview = document.getElementById("employeeImagePreview"),
    fileInput = document.getElementById("employeeImageFile");
  if (value) value.value = "";
  if (fileInput) fileInput.value = "";
  if (preview) {
    const name = document.querySelector('[name="name"]')?.value || "Ажилтан";
    preview.src = employeePlaceholderImage({ name });
  }
  document
    .querySelector(
      '.customer-image-upload__actions [onclick="clearEmployeeImage()"]',
    )
    ?.remove();
}
function employeeListHead() {
  return `<div class="employee-list__head" aria-hidden="true"><span>Ажилтан</span><span>Эрх / холбоо барих</span><span class="employee-list__head-actions">Үйлдэл</span></div>`;
}
function employeeRow(e) {
  const canEdit = hasPermission("employees.edit");
  const editBtn = canEdit
    ? editIconButton({
        className: "employee-card__btn employee-card__btn--ghost",
        attrs: `onclick="confirmEditEmployee('${esc(e.id)}')"`,
        label: "Ажилтан засах",
      })
    : "";
  const deleteBtn =
    hasPermission("employees.delete") || hasPermission("employees.edit")
      ? deleteIconButton({
          className: "employee-card__btn employee-card__btn--danger",
          attrs: `data-confirm-delete="employee" data-id="${esc(e.id)}"`,
          label: "Ажилтан устгах",
        })
      : "";
  const meta = `${role(e.role)} · ${e.email || "-"} · ${employeePermissionSummary(e)}`;
  return `<article class="employee-card"><header class="employee-card__head">${employeeAvatarHtml(e)}<div class="employee-card__identity"><h3 class="employee-card__name">${esc(e.name)}</h3><p class="employee-card__sub">${esc(meta)}</p></div></header><p class="employee-card__meta">${esc(meta)}</p><footer class="employee-card__actions">${editBtn}${deleteBtn}</footer></article>`;
}
function employeesView() {
  const addBtn = canManageEmployees()
    ? `<button onclick="employeeModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">+ Нэмэх</button>`
    : "";
  const headActions = addBtn;
  return `<div class="space-y-4">${pageHead("Ажилтан", headActions)}<div class="line-panel"><div class="employee-list">${employeeListHead()}${state.employees.map(employeeRow).join("")}</div></div></div>`;
}
function getSavedLogin() {
  try {
    const raw = localStorage.getItem("tomuda-login");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
const AUTH_SESSION_KEY = "tomuda-session";
function cleanSessionQtyMap(raw) {
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  Object.entries(raw).forEach(([id, value]) => {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    const qty = Math.floor(Number(value) || 0);
    if (qty > 0) result[id] = Math.min(qty, product.stock);
  });
  return result;
}
function authSessionPayload() {
  return {
    employeeId: state.currentEmployee.id,
    currentView: state.currentView,
    filters: { ...state.filters },
    searches: { ...state.searches },
    workerCustomer: state.workerCustomer || "",
    workerStoreReady: !!state.workerStoreReady,
    workerQty: { ...(state.workerQty || {}) },
    paymentTerm: state.paymentTerm || "cash",
    isPaid: !!state.isPaid,
    settlementAgreed: !!state.settlementAgreed,
    settlementText: state.settlementText || "",
    settlementMonth: state.settlementMonth || "",
    settlementDay: state.settlementDay || "",
    applyPercentDiscount: !!state.applyPercentDiscount,
    orderEmployee: state.orderEmployee || "",
    deliveryDate: state.deliveryDate || "",
    selectedWorkers: [...(state.selectedWorkers || [])],
    selectedWarehouseOrderId: state.selectedWarehouseOrderId || "",
    receiptPrintWorkerIds: [...(state.receiptPrintWorkerIds || [])],
    receiptPrintDeliveryId: state.receiptPrintDeliveryId || "",
    receiptPrintOrderIds: [...(state.receiptPrintOrderIds || [])],
    selectedDeliveryId: state.selectedDeliveryId || "",
    deliveryName: state.deliveryName || "",
    deliveryPhone: state.deliveryPhone || "",
    deliveryStoreId: state.deliveryStoreId || "",
    deliveryStoreReady: !!state.deliveryStoreReady,
  };
}
function applyLoginRoleDefaults(emp) {
  if (!emp) return;
  if (!canApplyPercentDiscount(emp)) state.applyPercentDiscount = false;
  if (emp.role === "sales") {
    state.selectedWorkers = [emp.id];
    state.selectedWarehouseOrderId = "";
  } else if (emp.role === "admin") {
    state.selectedWorkers = [];
    state.selectedWarehouseOrderId = "";
  } else if (emp.role === "warehouse" || emp.role === "delivery") {
    state.selectedWorkers = [];
    state.selectedWarehouseOrderId = "";
    if (emp.role === "delivery") {
      state.selectedDeliveryId = emp.id;
      state.deliveryName = emp.name;
      state.deliveryPhone = emp.phone || "";
      state.deliveryStoreId = "";
      state.deliveryStoreReady = false;
    } else {
      state.selectedDeliveryId = "";
      state.deliveryName = "";
      state.deliveryPhone = "";
    }
  }
}
function saveAuthSession() {
  if (!state.isLoggedIn || !state.currentEmployee?.id) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSessionPayload()));
}
function restoreAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const emp = state.employees.find((e) => e.id === data.employeeId);
    if (!emp) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return false;
    }
    state.currentEmployee = emp;
    state.isLoggedIn = true;
    state.orderEmployee = emp.id;
    applyLoginRoleDefaults(emp);
    const view = data.currentView;
    state.currentView =
      view && canAccessView(view) ? view : defaultViewForRole(emp.role);
    state.filters = { ...state.filters, ...(data.filters || {}) };
    state.searches = { ...state.searches, ...(data.searches || {}) };
    state.workerCustomer = state.customers.some(
      (c) => c.id === data.workerCustomer,
    )
      ? data.workerCustomer
      : "";
    state.workerStoreReady = !!state.workerCustomer && !!data.workerStoreReady;
    state.workerQty = cleanSessionQtyMap(data.workerQty);
    state.paymentTerm = data.paymentTerm === "credit" ? "credit" : "cash";
    state.isPaid =
      typeof data.isPaid === "boolean"
        ? data.isPaid
        : paidFromPaymentTerm(state.paymentTerm);
    state.settlementAgreed = !!data.settlementAgreed;
    state.settlementText = data.settlementText || "";
    state.settlementMonth = data.settlementMonth || "";
    state.settlementDay = data.settlementDay || "";
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(state.settlementText))
      state.settlementText = "";
    state.applyPercentDiscount = !!data.applyPercentDiscount;
    state.orderEmployee = data.orderEmployee || emp.id;
    state.deliveryDate = data.deliveryDate || "";
    state.selectedWorkers = idList(data.selectedWorkers);
    if (emp.role === "sales") state.selectedWorkers = [emp.id];
    state.selectedWarehouseOrderId = data.selectedWarehouseOrderId || "";
    state.receiptPrintWorkerIds = idList(data.receiptPrintWorkerIds);
    state.receiptPrintDeliveryId = data.receiptPrintDeliveryId || "";
    state.receiptPrintOrderIds = idList(data.receiptPrintOrderIds);
    state.selectedDeliveryId =
      data.selectedDeliveryId || state.selectedDeliveryId || "";
    state.deliveryName = data.deliveryName || state.deliveryName || "";
    state.deliveryPhone = data.deliveryPhone || state.deliveryPhone || "";
    ensureDeliverySelection();
    state.deliveryStoreId = data.deliveryStoreId || "";
    state.deliveryStoreReady =
      !!data.deliveryStoreReady && !!state.deliveryStoreId;
    if (!canApplyPercentDiscount(emp)) state.applyPercentDiscount = false;
    ensureOrderEmployeeSelection();
    return true;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return false;
  }
}
function saveLoginCredentials(email, password, remember) {
  if (!remember) {
    localStorage.removeItem("tomuda-login");
    return;
  }
  localStorage.setItem(
    "tomuda-login",
    JSON.stringify({ email, password, remember: true }),
  );
}
function togglePasswordField(inputId, btnId) {
  const input = document.getElementById(inputId),
    btn = document.getElementById(btnId);
  if (!input || !btn) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Нуух" : "Харах";
  btn.setAttribute("aria-label", show ? "Нууц үг нуух" : "Нууц үг харах");
}
function toggleLoginPassword() {
  togglePasswordField("loginPassword", "loginPasswordToggle");
}
function loginView() {
  const saved = getSavedLogin();
  const remember = !!saved?.remember;
  const installBtn = isNativeApp()
    ? ""
    : `<button type="button" onclick="installAppOnPhone()" class="btn btn--secondary btn--block">${pwaInstallLabel()}</button>`;
  return `<div class="auth-screen"><div class="auth-card"><div class="auth-card__brand"><img src="${BRAND.logoBlue}" alt="ТОМУДА" class="auth-card__logo" width="72" height="72" decoding="async"><h1 class="auth-card__title">ТОМУДА</h1><p class="auth-card__subtitle">Импорт, түгээлт удирдлага</p></div><form onsubmit="login(event)" class="auth-form" aria-label="Нэвтрэх"><label class="field-label" for="loginEmail">Email</label><input id="loginEmail" type="email" inputmode="email" autocomplete="username" placeholder="name@company.mn" value="${esc(saved?.email || "")}" class="field-input app-input"><label class="field-label" for="loginPassword">Нууц үг</label><div class="login-password-wrap"><input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••" value="${esc(saved?.password || "")}" class="field-input app-input"><button type="button" id="loginPasswordToggle" onclick="toggleLoginPassword()" class="login-password-toggle" aria-label="Нууц үг харах">Харах</button></div><label class="login-remember"><input id="loginRemember" type="checkbox" ${remember ? "checked" : ""}><span>Нэвтрэх мэдээлэл санах</span></label><div id="loginError" class="auth-form__error" role="alert"></div><button type="submit" class="btn btn--primary btn--lg btn--block">Нэвтрэх</button>${installBtn}</form></div></div>`;
}
function workerOrdersList() {
  let list = state.orders.filter((o) => o.status !== "cancelled");
  if (state.currentEmployee?.role === "sales") {
    list = list.filter((o) => o.employeeId === state.currentEmployee.id);
  }
  const pay = state.filters.workerPay;
  if (pay === "paid") list = list.filter((o) => orderIsPaid(o));
  if (pay === "unpaid") list = list.filter((o) => !orderIsPaid(o));
  const day = state.filters.workerDate;
  if (day) list = list.filter((o) => orderCreatedDay(o) === day);
  return list.sort(compareOrdersNewestFirst);
}
function workerViewTabsHtml(tab) {
  return `<div class="worker-view__tabs" role="tablist" aria-label="Захиалга"><button type="button" role="tab" onclick="openWorkerNewTab()" class="seg-tab${tab === "new" ? " is-active" : ""}" aria-selected="${tab === "new" ? "true" : "false"}">Шинэ захиалга</button><button type="button" role="tab" onclick="openWorkerOrdersTab()" class="seg-tab${tab === "orders" ? " is-active" : ""}" aria-selected="${tab === "orders" ? "true" : "false"}">Захиалга харах</button></div>`;
}
function workerView() {
  const tab = state.filters.worker,
    cart = workerCartSummary(),
    orders = workerOrdersList(),
    inActiveOrder =
      tab === "new" && state.workerStoreReady && !!state.workerCustomer;
  return `<div class="worker-view space-y-3${tab === "orders" ? " worker-view--orders" : ""}${state.workerOrdersArrived && tab === "orders" ? " worker-view--orders-arrived" : ""}${inActiveOrder ? " worker-view--ordering" : ""}">${workerViewTabsHtml(tab)}${tab === "new" ? workerNew(cart) : workerOrders(orders)}</div>`;
}
function clearWorkerOrderHighlight() {
  state.workerOrdersArrived = false;
  state.workerHighlightOrderId = "";
}
function openWorkerNewTab() {
  if (state.filters.worker === "new") return;
  clearWorkerOrderHighlight();
  state.filters.worker = "new";
  render();
  pushAppHistory();
}
function openWorkerOrdersTab() {
  if (state.filters.worker === "orders") return;
  state.filters.worker = "orders";
  render();
  pushAppHistory();
  requestAnimationFrame(scrollWorkerOrdersToDate);
}
function clearWorkerOrderDate() {
  state.filters.workerDate = "";
  render();
}
function setWorkerOrderDate(day) {
  state.filters.workerDate = day;
  render();
  requestAnimationFrame(scrollWorkerOrdersToDate);
}
function scrollWorkerOrdersToDate() {
  const day = state.filters.workerDate;
  if (!day) return;
  document
    .querySelector(`[data-order-day="${day}"]`)
    ?.scrollIntoView({ behavior: "auto", block: "nearest" });
}
function scrollWarehouseReceiptListToActive() {
  if (state.currentView !== "warehouseReceipts") return;
  if (window.matchMedia("(min-width: 1024px)").matches) return;
  const activeId = state.selectedWarehouseOrderId || "";
  if (!activeId || warehouseReceiptScrollId === activeId) return;
  warehouseReceiptScrollId = activeId;
  requestAnimationFrame(() => {
    const list = document.querySelector(".wh-receipt-list");
    const item = list?.querySelector(".wh-receipt-list__item.is-active");
    if (!list || !item) return;
    const edge = 6;
    const visibleTop = list.scrollTop;
    const visibleBottom = visibleTop + list.clientHeight;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    if (itemTop < visibleTop + edge) {
      list.scrollTop = Math.max(0, itemTop - edge);
    } else if (itemBottom > visibleBottom - edge) {
      list.scrollTop = itemBottom - list.clientHeight + edge;
    }
  });
}
function warehouseView() {
  const orders = warehouseOrdersForSelectedWorkers();
  return `<div class="space-y-3">${pageHead("Нярав")}<div class="grid grid-cols-1 gap-3">${workerChooser(orders)}</div></div>`;
}
function deliveryRelevantOrders() {
  const empId = state.currentEmployee?.id || "";
  return state.orders.filter((o) => {
    if (o.status === "cancelled" || o.status === "delivered") return false;
    const delId = o.deliveryEmployeeId || "";
    if (empId && delId && delId !== empId) return false;
    return !!o.customerId;
  });
}
function deliveryStoresWithOrders() {
  const byCustomer = {};
  deliveryRelevantOrders().forEach((o) => {
    const cid = o.customerId;
    if (!byCustomer[cid]) byCustomer[cid] = { orderCount: 0, total: 0 };
    byCustomer[cid].orderCount += 1;
    byCustomer[cid].total += orderAmount(o);
  });
  return Object.entries(byCustomer)
    .map(([id, meta]) => {
      const customer = state.customers.find((c) => c.id === id);
      if (!customer) return null;
      return { customer, ...meta };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.customer.name || "").localeCompare(
        String(b.customer.name || ""),
        "mn",
      ),
    );
}
function filterDeliveryStores(rows, q) {
  const query = String(q || "")
    .trim()
    .toLowerCase();
  if (!query) return rows;
  return rows.filter(({ customer: c }) =>
    [
      c.name,
      c.companyName,
      c.registrationNumber,
      ...customerPhonesList(c),
      c.address,
      c.province,
      c.district,
      c.locationText,
    ].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(query),
    ),
  );
}
function customerHasCoords(c) {
  const lat = Number(c?.latitude),
    lng = Number(c?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}
function customerStoreImage(c) {
  const src = entityImageSrc(c?.image);
  if (src) return src;
  const name = String(c?.name || "Дэлгүүр").slice(0, 16);
  const hue =
    [...String(c?.name || "Д")].reduce((s, ch) => s + ch.charCodeAt(0), 0) %
    360;
  const bg = `hsl(${hue} 48% 90%)`;
  const accent = `hsl(${hue} 58% 40%)`;
  const safe = name.replace(/[<>&"]/g, "");
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="${bg}"/><circle cx="320" cy="44" r="58" fill="${accent}" opacity=".14"/><path d="M200 168c0 0 74-47 74-110a74 74 0 1 0-148 0c0 63 74 110 74 110z" fill="${accent}"/><circle cx="200" cy="58" r="24" fill="#fff"/><text x="200" y="200" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#182032">${safe}</text></svg>`)}`;
}
function deliveryStoreCard(entry, active = false) {
  const c = entry.customer,
    id = esc(c.id),
    addr = customerAddress(c),
    meta = [customerPhonesList(c)[0] || "", addr !== "-" ? addr : ""]
      .filter(Boolean)
      .join(" · ");
  return `<button type="button" class="delivery-store-card${active ? " is-active" : ""}" onclick="pickDeliveryStore('${id}')" aria-pressed="${active ? "true" : "false"}"><div class="delivery-store-card__media"><img src="${customerStoreImage(c)}" alt="" class="delivery-store-card__img" loading="lazy" decoding="async"><span class="delivery-store-card__pin" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></span>${entry.orderCount ? `<span class="delivery-store-card__badge">${entry.orderCount} захиалга</span>` : ""}</div><div class="delivery-store-card__body"><p class="delivery-store-card__name">${esc(c.name)}</p>${c.companyName ? `<p class="delivery-store-card__company">${esc(c.companyName)}</p>` : ""}<p class="delivery-store-card__meta">${esc(meta || "—")}</p><p class="delivery-store-card__total">${fmt(entry.total)}</p></div></button>`;
}
function deliveryStorePickStep() {
  const q = state.searches.deliveryStore || "",
    rows = filterDeliveryStores(deliveryStoresWithOrders(), q);
  return `<section class="delivery-view"><div class="delivery-view__head">${pageHead("Хүргэлт")}<p class="delivery-view__lead">Захиалгатай дэлгүүр сонгоно уу</p></div><div class="delivery-view__toolbar"><input data-focus="deliveryStore" type="search" inputmode="search" value="${esc(q)}" oninput="search('deliveryStore',this.value)" placeholder="Нэр, утас, хаягаар хайх..." class="delivery-view__search app-input" autocomplete="off" aria-label="Дэлгүүр хайх"></div>${rows.length ? `<div class="delivery-store-grid">${rows.map((entry) => deliveryStoreCard(entry, state.deliveryStoreId === entry.customer.id)).join("")}</div>` : `<p class="delivery-view__empty">${q ? "Олдсонгүй" : "Захиалгатай дэлгүүр байхгүй"}</p>`}</section>`;
}
function deliveryOrdersForStore(customerId) {
  return deliveryRelevantOrders()
    .filter((o) => o.customerId === customerId)
    .sort(compareOrdersNewestFirst);
}
function deliveryStoreMapStep() {
  const selected = state.customers.find((c) => c.id === state.deliveryStoreId),
    q = state.searches.deliveryStore || "",
    rows = filterDeliveryStores(deliveryStoresWithOrders(), q),
    orders = selected ? deliveryOrdersForStore(selected.id) : [],
    addr = selected ? customerAddress(selected) : "-",
    maps =
      selected && customerHasCoords(selected)
        ? mapsLink(selected.latitude, selected.longitude)
        : "";
  if (!selected) {
    state.deliveryStoreReady = false;
    state.deliveryStoreId = "";
    return deliveryStorePickStep();
  }
  const selectedEntry =
    rows.find((r) => r.customer.id === selected.id) ||
    deliveryStoresWithOrders().find((r) => r.customer.id === selected.id);
  const orderList = orders.length
    ? orders
        .map(
          (o) =>
            `<button type="button" class="delivery-order-row" onclick="orderReceiptModal('${esc(o.id)}')"><div class="delivery-order-row__main"><span class="delivery-order-row__no">${receiptNo(o, "xs")}</span><span class="delivery-order-row__meta">${dte(orderDeliveryDay(o))} · ${o.items.length} бараа</span></div><b class="delivery-order-row__total">${fmt(orderAmount(o))}</b></button>`,
        )
        .join("")
    : `<p class="delivery-view__empty">Захиалга алга</p>`;
  const otherStores = rows
    .filter((entry) => entry.customer.id !== selected.id)
    .map((entry) => deliveryStoreCard(entry, false))
    .join("");
  return `<section class="delivery-view delivery-view--map"><div class="delivery-view__head delivery-view__head--row"><button type="button" onclick="clearDeliveryStore()" class="btn btn--secondary btn--sm">← Дэлгүүр солих</button><h2 class="delivery-view__title">${esc(selected.name)}</h2></div><div id="deliveryMap" class="delivery-map" role="region" aria-label="Дэлгүүрийн байршил"></div><p id="deliveryMapStatus" class="delivery-map__status"></p><div class="delivery-view__toolbar"><input type="search" inputmode="search" value="${esc(q)}" oninput="search('deliveryStore',this.value)" placeholder="Бусад дэлгүүр хайх..." class="delivery-view__search app-input" autocomplete="off"></div><article class="delivery-store-detail">${selectedEntry ? deliveryStoreCard(selectedEntry, true) : ""}<div class="delivery-store-detail__extra"><p class="delivery-store-detail__addr">${esc(addr)}</p>${selected.locationText ? `<p class="delivery-store-detail__hint">${esc(selected.locationText)}</p>` : ""}${maps ? `<a href="${maps}" target="_blank" rel="noopener noreferrer" class="delivery-store-detail__maps">Google Maps нээх</a>` : `<p class="delivery-store-detail__hint">Байршил бүртгэгдээгүй</p>`}</div></article><div class="delivery-orders"><h3 class="delivery-orders__title">Захиалга (${orders.length})</h3><div class="delivery-orders__list">${orderList}</div></div>${otherStores ? `<div class="delivery-other-stores"><h3 class="delivery-other-stores__title">Бусад дэлгүүр</h3><div class="delivery-store-grid delivery-store-grid--compact">${otherStores}</div></div>` : ""}</section>`;
}
function deliveryView() {
  if (!state.deliveryStoreReady || !state.deliveryStoreId) {
    return deliveryStorePickStep();
  }
  return deliveryStoreMapStep();
}
function pickDeliveryStore(id) {
  if (!id) return;
  state.deliveryStoreId = id;
  state.deliveryStoreReady = true;
  render();
}
function clearDeliveryStore() {
  state.deliveryStoreId = "";
  state.deliveryStoreReady = false;
  destroyDeliveryMap();
  render();
}
function cleanupDeliveryMapInstance() {
  if (window.deliveryMapMarkers) {
    window.deliveryMapMarkers.forEach((m) => {
      try {
        m.remove();
      } catch (e) {}
    });
  }
  window.deliveryMapMarkers = [];
  if (window.deliveryUserMarker) {
    try {
      window.deliveryUserMarker.remove();
    } catch (e) {}
  }
  window.deliveryUserMarker = null;
  if (window.deliveryMap?.remove) {
    try {
      window.deliveryMap.off();
      window.deliveryMap.remove();
    } catch (e) {}
  }
  window.deliveryMap = null;
}
function destroyDeliveryMap() {
  if (window.deliveryMapInitTimer) {
    clearTimeout(window.deliveryMapInitTimer);
    window.deliveryMapInitTimer = null;
  }
  if (window.deliveryMapResizeTimer) {
    clearTimeout(window.deliveryMapResizeTimer);
    window.deliveryMapResizeTimer = null;
  }
  cleanupDeliveryMapInstance();
  const el = document.getElementById("deliveryMap");
  if (el) {
    el.removeAttribute("data-leaflet-id");
    el._leaflet_id = undefined;
    el.innerHTML = "";
  }
}
function scheduleDeliveryMapResize() {
  const fix = () => {
    if (window.deliveryMap) window.deliveryMap.invalidateSize(true);
  };
  fix();
  requestAnimationFrame(fix);
  clearTimeout(window.deliveryMapResizeTimer);
  window.deliveryMapResizeTimer = setTimeout(fix, 150);
}
function initDeliveryRouteMap(stores, selectedId) {
  const el = document.getElementById("deliveryMap"),
    status = document.getElementById("deliveryMapStatus");
  if (!el) return;
  if (!window.L) {
    el.innerHTML =
      '<div class="delivery-map__loading">Газрын зураг ачаалж байна...</div>';
    loadLeaflet(() => initDeliveryRouteMap(stores, selectedId));
    return;
  }
  cleanupDeliveryMapInstance();
  if (!document.getElementById("deliveryMap")) return;
  const mapEl = document.getElementById("deliveryMap");
  mapEl.removeAttribute("data-leaflet-id");
  mapEl._leaflet_id = undefined;
  mapEl.innerHTML = "";
  const points = stores
    .map(({ customer: c }) => c)
    .filter(customerHasCoords)
    .map((c) => ({
      id: c.id,
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      name: c.name,
    }));
  const selected = points.find((p) => p.id === selectedId) || points[0],
    start = selected ? [selected.lat, selected.lng] : [47.9189, 106.9176];
  window.deliveryMap = L.map(mapEl, { tap: true, zoomControl: true }).setView(
    start,
    selected ? 15 : 12,
  );
  window.deliveryTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "&copy; OpenStreetMap" },
  ).addTo(window.deliveryMap);
  window.deliveryMapMarkers = [];
  const bounds = [];
  points.forEach((p) => {
    const isActive = p.id === selectedId;
    const icon = L.divIcon({
      className: `delivery-map-pin${isActive ? " delivery-map-pin--active" : ""}`,
      html: `<span class="delivery-map-pin__dot" aria-hidden="true"></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(window.deliveryMap)
      .bindTooltip(String(p.name || ""), { direction: "top" });
    marker.on("click", () => pickDeliveryStore(p.id));
    window.deliveryMapMarkers.push(marker);
    bounds.push([p.lat, p.lng]);
  });
  if (bounds.length > 1) {
    window.deliveryMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    if (selected) window.deliveryMap.setView([selected.lat, selected.lng], 15);
  }
  if (status) {
    status.textContent = points.length
      ? `${points.length} дэлгүүр газрын зураг дээр`
      : "Байршил бүртгэлтэй дэлгүүр байхгүй";
  }
  showDeliveryUserLocation(!!selected);
  scheduleDeliveryMapResize();
}
function showDeliveryUserLocation(hasStorePin) {
  if (!window.deliveryMap || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!window.deliveryMap) return;
      const la = pos.coords.latitude,
        ln = pos.coords.longitude;
      if (window.deliveryUserMarker) window.deliveryUserMarker.remove();
      window.deliveryUserMarker = L.circleMarker([la, ln], {
        radius: 9,
        fillColor: "#16899a",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 0.95,
      })
        .addTo(window.deliveryMap)
        .bindTooltip("Таны байршил", { direction: "top" });
      if (!hasStorePin) window.deliveryMap.setView([la, ln], 14);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}
function warehouseReceiptsView() {
  const employeeIds = warehouseScopeWorkerIds();
  const requireWorkerScope = state.currentEmployee?.role === "sales";
  return `<div class="space-y-4">${orderReceiptsPanel({ compact: true, employeeIds, requireWorkerScope })}</div>`;
}
function workerChooser(orders) {
  const qty = orders
      .flatMap((o) => o.items)
      .reduce((s, i) => s + i.quantity, 0),
    total = orders.reduce((s, o) => s + orderAmount(o), 0),
    activeWorkerIds = warehouseActiveWorkerIds(orders),
    canPick = canPickWarehouseWorkers(),
    hasSelection = canPick ? !!state.selectedWorkers.length : true,
    hasOrders = !!orders.length,
    selectedIds = warehouseScopeWorkerIds(),
    names = state.employees
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => e.name)
      .join(", "),
    detail = qtyDetail(orders),
    // Show the picked reps' names here even when they have no orders — the
    // empty state is already communicated in the list below.
    chooserLabel = canPick
      ? hasSelection && names
        ? names
        : "Сонгох"
      : state.currentEmployee?.name || "-",
    emptyText = canPick
      ? hasSelection
        ? "Сонгосон ХТ дээр захиалга алга"
        : "Худалдааны төлөөлөгч сонгоно уу"
      : "Өнөөдрийн захиалга алга",
    pickerHtml = canPick
      ? `<button type="button" onclick="workerSelectModal()" class="wh-worker-chooser" aria-haspopup="dialog" aria-label="Худалдааны төлөөлөгч сонгох"><span class="wh-worker-chooser__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></span><span class="wh-worker-chooser__body"><span class="wh-worker-chooser__label">Худалдааны төлөөлөгч</span><span class="wh-worker-chooser__value${chooserLabel === "Сонгох" ? " is-placeholder" : ""}">${esc(chooserLabel)}</span></span><svg class="wh-worker-chooser__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
      : `<div class="wh-worker-chooser wh-worker-chooser--static"><span class="wh-worker-chooser__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></span><span class="wh-worker-chooser__body"><span class="wh-worker-chooser__label">Худалдааны төлөөлөгч</span><span class="wh-worker-chooser__value">${esc(chooserLabel)}</span></span></div>`;
  return `<section class="bg-card rounded p-3 space-y-3">${warehouseLiveFilterBannerHtml()}${pageToolbarHtml({ filters: warehouseDateFiltersHtml(), actions: excelDownloadBtn("confirmEmployeeExcel()", { disabled: !hasOrders }) })}${pickerHtml}<div class="grid grid-cols-3 gap-2 text-sm bg-secondary/50 rounded p-2 text-center"><div><b>${activeWorkerIds.length}</b><p class="text-xs text-muted-foreground">Ажилтан</p></div><div><b>${qty}</b><p class="text-xs text-muted-foreground">Ширхэг</p></div><div><b class="text-primary">${fmt(total)}</b><p class="text-xs text-muted-foreground">Дүн</p></div></div><div class="divide-y divide-border">${detail.length ? detail.map(detailRow).join("") : `<p class="p-3 text-sm text-muted-foreground text-center">${emptyText}</p>`}</div></section>`;
}
function deliveryInitial(name) {
  const n = String(name || "").trim();
  return (n[0] || "?").toUpperCase();
}
function deliveryOptionId(empId) {
  return `delivery-opt-${String(empId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
function deliveryPickerOption(e, selected) {
  const active = selected === e.id,
    optId = deliveryOptionId(e.id);
  return `<button type="button" role="option" id="${optId}" data-delivery-id="${esc(e.id)}" aria-selected="${active}" onclick="selectDeliveryEmployee(this.getAttribute('data-delivery-id'))" class="delivery-picker-option ${active ? "is-active" : ""}">${employeeAvatarHtml(e, "delivery-picker-option__avatar")}<span class="delivery-picker-option__main"><span class="delivery-picker-option__name">${esc(e.name)}</span><span class="delivery-picker-option__phone">${esc(e.phone || "Утасгүй")}</span></span><span class="delivery-picker-option__check" aria-hidden="true">${active ? "✓" : ""}</span></button>`;
}
function deliveryPickerRows(selected = "", q = "") {
  const query = String(q || "")
    .trim()
    .toLowerCase();
  const list = deliveryEmployees().filter((e) => {
    if (!query) return true;
    return (
      e.name.toLowerCase().includes(query) ||
      String(e.phone || "").includes(query)
    );
  });
  if (!list.length)
    return `<p class="delivery-picker-empty" role="status">Түгээгч олдсонгүй</p>`;
  return list.map((e) => deliveryPickerOption(e, selected)).join("");
}
function warehouseDeliveryField() {
  const name = state.deliveryName || "",
    has = !!name;
  return `<button type="button" id="warehouse-delivery-trigger" class="w-full text-left bg-secondary rounded p-3 flex items-center justify-between gap-2" onclick="deliveryPickerModal()" aria-labelledby="warehouse-delivery-value" aria-haspopup="listbox" aria-expanded="false" aria-controls="delivery-picker-list"><span class="font-semibold">Түгээгч</span><span id="warehouse-delivery-value" class="text-sm truncate${has ? "" : " text-muted-foreground"}">${has ? esc(name) : "Сонгох"}</span></button>`;
}
function deliveryPickerSearch(value) {
  state.searches.deliveryPick = value;
  const list = document.querySelector("[data-delivery-list]");
  if (!list) {
    deliveryPickerModal();
    return;
  }
  list.innerHTML = deliveryPickerRows(
    state.selectedDeliveryId,
    state.searches.deliveryPick || "",
  );
  const el = document.querySelector('[data-focus="deliveryPick"]');
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function deliveryPickerModal() {
  const list = deliveryEmployees(),
    selected = state.selectedDeliveryId,
    q = state.searches.deliveryPick || "",
    activeDesc = selected ? deliveryOptionId(selected) : "";
  const body = list.length
    ? `<div class="p-5 delivery-picker modal-scroll max-h-[75vh] overflow-y-auto"><p id="delivery-picker-desc" class="delivery-picker__desc">Хүргэлт хийх түгээгчийг сонгоно уу.</p><label class="sr-only" for="delivery-picker-search">Түгээгч хайх</label><div class="delivery-picker__search-wrap"><input id="delivery-picker-search" data-focus="deliveryPick" type="search" inputmode="search" autocomplete="off" value="${esc(q)}" oninput="deliveryPickerSearch(this.value)" placeholder="Нэр, утсаар хайх..." class="delivery-picker__search app-input" aria-describedby="delivery-picker-desc"><span class="delivery-picker__search-icon" aria-hidden="true">⌕</span></div><div role="listbox" id="delivery-picker-list" class="delivery-picker-list" aria-label="Түгээгчүүд"${activeDesc ? ` aria-activedescendant="${activeDesc}"` : ""} data-delivery-list>${deliveryPickerRows(selected, q)}</div><div class="delivery-picker-footer"><button type="button" onclick="clearDeliveryEmployee();render();deliveryPickerModal()" class="delivery-picker-footer__btn delivery-picker-footer__btn--secondary" aria-label="Сонголтыг цэвэрлэх">Цэвэрлэх</button><button type="button" onclick="closeModal();render()" class="delivery-picker-footer__btn delivery-picker-footer__btn--primary">Хаах</button></div></div>`
    : `<div class="p-5 delivery-picker modal-scroll"><div class="delivery-picker-empty-state" role="status"><span class="delivery-picker-empty-state__icon" aria-hidden="true"><svg class="ui-icon ui-icon--lg" viewBox="0 0 24 24"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 4v5h-7v-9z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></svg></span><p class="delivery-picker-empty-state__title">Түгээгч бүртгэлгүй</p><p class="delivery-picker-empty-state__text">Админ → Ажилтан → «Түгээгч» эрхээр нэмнэ.</p></div><button type="button" onclick="closeModal();render()" class="delivery-picker-footer__btn delivery-picker-footer__btn--primary w-full">Хаах</button></div>`;
  box("Түгээгч сонгох", body, "max-w-md", {
    dialog: true,
    titleId: "delivery-picker-title",
    closeLabel: "Түгээгч сонгох цонхыг хаах",
  });
  requestAnimationFrame(() => {
    const trigger = document.getElementById("warehouse-delivery-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    const search = document.getElementById("delivery-picker-search");
    if (search) search.focus();
  });
}
function selectDeliveryEmployee(id) {
  const emp = state.employees.find((e) => e.id === id && e.role === "delivery");
  if (!emp) return;
  state.selectedDeliveryId = emp.id;
  state.deliveryName = emp.name;
  state.deliveryPhone = emp.phone || "";
  closeModal();
  scheduleBackendSave();
  render();
}
function clearDeliveryEmployee() {
  state.selectedDeliveryId = "";
  state.deliveryName = "";
  state.deliveryPhone = "";
  scheduleBackendSave();
}
function qtyDetail(orders) {
  const map = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const key = i.productId || i.productName;
      if (!map[key]) {
        map[key] = {
          productId: i.productId,
          productName: i.productName,
          qty: 0,
        };
      }
      map[key].qty += i.quantity;
    }),
  );
  return Object.values(map)
    .map((row) => ({
      product: warehousePrepareProduct(row),
      qty: row.qty,
    }))
    .sort((a, b) => b.qty - a.qty);
}
function detailRow(x) {
  const p = x.product;
  return `<div class="detail-row flex items-center gap-3 px-3 py-2"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb shrink-0" alt=""><div class="min-w-0 flex-1"><p class="font-medium truncate text-sm">${p.name || "-"}</p></div><b class="text-sm shrink-0">${x.qty} ш</b></div>`;
}
function workerStoreSummary(c, compact = false) {
  if (!c)
    return `<p class="text-sm text-muted-foreground">Харилцагч сонгоогүй</p>`;
  const addr = [c.province, c.district, c.khoroo, c.address]
    .filter(Boolean)
    .join(", ");
  const reg = customerRegistrationDisplay(c) || "—";
  if (compact)
    return `<div class="worker-order-store"><p class="worker-order-store__name">${esc(c.name)}</p><p class="worker-order-store__reg"><span class="worker-order-store__reg-label">Регистр</span> ${esc(reg)}</p></div>`;
  return `<div class="rounded bg-primary/10 p-3 text-sm space-y-0.5"><p class="font-semibold">${esc(c.name)}</p><p><span class="text-muted-foreground">Регистр:</span> ${esc(reg)}</p><p class="text-xs text-muted-foreground worker-store-extra truncate">${esc(addr || "")}</p></div>`;
}
function workerOrderAgentField() {
  ensureOrderEmployeeSelection();
  const agents = salesOrderAgents();
  const selected = state.orderEmployee || state.currentEmployee?.id || "";
  return `<label class="worker-order-field"><span class="worker-order-field__label">Худалдааны төлөөлөгч</span><select onchange="state.orderEmployee=this.value;render()" class="field-input app-input">${agents
    .map(
      (e) =>
        `<option value="${e.id}" ${selected === e.id ? "selected" : ""}>${esc(e.name)} (${role(e.role)})</option>`,
    )
    .join("")}</select></label>`;
}
function workerOrderEmptyState() {
  return `<div class="worker-order-empty"><p class="worker-order-empty__text">Бараа байхгүй</p></div>`;
}
function filterWorkerStores() {
  const q = state.searches.workerStore || "";
  return sortCustomersByName(
    state.customers.filter((c) => customerMatchesQuery(c, q)),
  );
}
function workerStorePickStep() {
  const q = state.searches.workerStore || "",
    rows = filterWorkerStores(),
    selected = state.workerCustomer
      ? state.customers.find((c) => c.id === state.workerCustomer)
      : null;
  const selectedBanner = selected
    ? `<div class="worker-pick-selected"><p class="worker-pick-selected__label">Харилцагч</p><div class="worker-pick-selected__store">${workerStoreSummary(selected, true)}</div><button type="button" onclick="confirmWorkerStore()" class="btn btn--primary btn--block btn--lg">Захиалга үргэлжлүүлэх</button></div>`
    : `<p class="worker-pick__hint">Дэлгүүр / харилцагч сонгоно уу</p>`;
  return `<section class="worker-pick"><div class="worker-pick__toolbar"><input data-focus="workerStore" type="search" inputmode="search" value="${esc(q)}" oninput="search('workerStore',this.value)" placeholder="Нэр, РД-ээр хайх..." class="worker-pick__search" autocomplete="off" aria-label="Харилцагч хайх"></div>${selectedBanner}${rows.length ? `<div class="worker-pick-list">${rows.map(workerPickCard).join("")}</div>` : `<p class="worker-pick__empty">${q ? "Олдсонгүй" : "Харилцагч байхгүй"}</p>`}</section>`;
}
function pickWorkerStore(id) {
  state.workerCustomer = state.workerCustomer === id ? "" : id;
  render();
}
function confirmWorkerStore() {
  if (!state.workerCustomer) return;
  state.workerStoreReady = true;
  state.deliveryDate = todayIso();
  resetWorkerCart();
  render();
  pushAppHistory();
}
function clearWorkerStore() {
  state.workerStoreReady = false;
  state.workerCustomer = "";
  state.deliveryDate = "";
  state.searches.workerStore = "";
  state.settlementAgreed = false;
  state.settlementText = "";
  state.settlementMonth = "";
  state.settlementDay = "";
  state.applyPercentDiscount = false;
  resetWorkerCart();
  render();
}
function workerNew(cart) {
  if (!state.workerStoreReady || !state.workerCustomer)
    return workerStorePickStep();
  return workerNewOrderStep(cart);
}
function workerPromoRow(line) {
  const p = state.products.find((x) => x.id === line.productId) || {};
  return `<div class="worker-selected-row worker-promo-row"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${esc(line.productName)}</p><p class="worker-promo-row__label">${PROMO_PRODUCT_LABEL}</p></div><b class="text-sm">${line.quantity} ш</b></div>`;
}
function paymentTermPicker() {
  const term = state.paymentTerm;
  return `<div class="seg-tabs worker-payment-tabs"><button type="button" onclick="setPaymentTerm('cash')" class="seg-tab ${term === "cash" ? "is-active" : ""}">${paymentTermLabel("cash")}</button><button type="button" onclick="setPaymentTerm('credit')" class="seg-tab ${term === "credit" ? "is-active" : ""}">${paymentTermLabel("credit")}</button></div>`;
}
function workerOrderOptionsHtml(cart) {
  const pct = percentDiscountRate(),
    pctAllowed = canApplyPercentDiscount(),
    cashOnly = isCashPayment(),
    settlementText = settlementTextForInput(state),
    settlementBody = state.settlementAgreed
      ? `<div class="worker-order-opt__body"><div class="worker-order-opt__fields"><textarea rows="1" class="app-input worker-order-opt__input" data-settlement-input aria-label="Тэмдэглэл" placeholder="Тайлбар" oninput="applySettlementTextInput(this.value);growSettlementInput(this)" onfocus="settlementInputFocus()" onblur="settlementInputBlur()">${esc(settlementText)}</textarea></div></div>`
      : "",
    pctRow = pctAllowed
      ? `<div class="worker-order-opt${workerPercentDiscountActive() ? " is-open" : ""}${cashOnly ? "" : " worker-order-opt--disabled"}" aria-expanded="${workerPercentDiscountActive() ? "true" : "false"}"><label class="worker-order-opt__head"><input type="checkbox" ${workerPercentDiscountActive() ? "checked" : ""}${cashOnly ? "" : " disabled"} onchange="state.applyPercentDiscount=this.checked;render()" aria-label="Хувь тооцох идэвхжүүлэх"><span class="worker-order-opt__title">Хувь тооцох</span><span class="worker-order-opt__badge${cashOnly ? "" : " worker-order-opt__badge--muted"}" aria-hidden="true">${pct}%</span></label></div>`
      : "";
  return `<div class="worker-order-options" role="group" aria-label="Захиалгын нэмэлт сонголт"><div class="worker-order-opt${state.settlementAgreed ? " is-open" : ""}" aria-expanded="${state.settlementAgreed ? "true" : "false"}"><label class="worker-order-opt__head"><input type="checkbox" ${state.settlementAgreed ? "checked" : ""} onchange="state.settlementAgreed=this.checked;state.settlementText='';state.settlementMonth='';state.settlementDay='';render()" aria-label="Тэмдэглэл идэвхжүүлэх"><span class="worker-order-opt__title">Тэмдэглэл</span></label>${settlementBody}</div>${pctRow}</div>`;
}
function setPaymentTerm(term) {
  state.paymentTerm = term;
  state.isPaid = paidFromPaymentTerm(term);
  if (term === "credit") state.applyPercentDiscount = false;
  render();
}
function workerOrderStatsHtml(cart) {
  if (!cart.skuCount) return "";
  return `<div class="worker-order-stats"><div class="worker-order-stat"><span class="worker-order-stat__value">${cart.skuCount}</span><span class="worker-order-stat__label">Бараа</span></div><div class="worker-order-stat"><span class="worker-order-stat__value">${cart.pieceQty}</span><span class="worker-order-stat__label">Ширхэг</span></div><div class="worker-order-stat worker-order-stat--total"><span class="worker-order-stat__value">${fmt(cart.total)}</span><span class="worker-order-stat__label">Дүн</span></div></div>${cart.discount > 0 ? `<p class="worker-order-stats__note">Хөнгөлөлт ${fmt(cart.discount)} · Үндсэн дүн ${fmt(cart.gross)}</p>` : ""}`;
}
function workerNewOrderStep(cart) {
  ensureOrderEmployeeSelection();
  const customer = state.customers.find((c) => c.id === state.workerCustomer),
    showAgentPicker = shouldShowOrderAgentPicker(),
    agentMetaHtml = showAgentPicker
      ? `<div class="worker-order-meta">${workerOrderAgentField()}</div>`
      : `<div class="worker-order-meta"><p class="worker-order-sales">${esc(state.currentEmployee?.name || "-")}</p></div>`,
    receivableHtml = workerReceivableHtml(customer?.id),
    paidProducts = workerPaidProductsInCart(),
    hasItems = paidProducts.length > 0,
    listHtml = hasItems
      ? paidProducts.map(workerSelectedRow).join("") +
        (cart.promo.length ? cart.promo.map(workerPromoRow).join("") : "")
      : "";
  const saving = orderSubmitLock;
  return `<section class="worker-order-card"><header class="worker-order-card__head"><div class="worker-order-card__store-wrap">${workerStoreSummary(customer, true)}</div><button type="button" onclick="clearWorkerStore()" class="btn btn--secondary btn--sm shrink-0"${saving ? " disabled" : ""}>Солих</button></header><div class="worker-order-card__body">${hasItems ? workerOrderStatsHtml(cart) : ""}<div class="worker-order-card__tools">${receivableHtml}${agentMetaHtml}<button type="button" onclick="openPickerModal()" class="worker-order-add-btn" aria-label="Бараа сонгох"${saving ? " disabled" : ""}><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Бараа сонгох</span></button></div><div class="worker-order-lines-wrap"><div class="worker-order-lines divide-y divide-border">${listHtml || workerOrderEmptyState()}</div></div></div><footer class="worker-order-card__foot">${workerOrderOptionsHtml(cart)}${paymentTermPicker()}<button type="button" onclick="saveWorker()" class="btn btn--primary btn--lg btn--block${hasItems && !saving ? "" : " is-disabled"}" ${hasItems && !saving ? "" : "disabled"}>${saving ? "Хадгалж байна..." : "Хадгалах"}</button></footer></section>`;
}
function workerSelectedRow(p) {
  const editing = state.workerOrderActiveId === p.id;
  const remain = Math.max(0, (Number(p.stock) || 0) - p.qty);
  return `<div class="worker-selected-row${editing ? " is-editing" : ""}"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img class="product-thumb" alt=""><div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(p.name)}</p><p class="worker-row-meta text-xs text-muted-foreground">${esc(p.category)} · ${fmt(p.price)} × ${p.qty} = <b class="text-primary">${fmt(p.price * p.qty)}</b> · Үлд ${remain}</p></div>${workerOrderQtyHtml(p, p.qty)}</div>`;
}
function workerOrders(orders) {
  const total = orders.reduce((s, o) => s + orderAmount(o), 0),
    paid = orders
      .filter((o) => orderIsPaid(o))
      .reduce((s, o) => s + orderAmount(o), 0),
    unpaid = total - paid,
    day = state.filters.workerDate || "",
    pay = state.filters.workerPay,
    today = todayIso(),
    todayPastDisabled = isDayBeforeToday(day),
    todayBtnClass = `worker-orders-filters__chip${day === today ? " is-active" : ""}${todayPastDisabled ? " is-disabled" : ""}`;
  return `<section class="worker-orders-panel">${metricsBar(`${card("Нийт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(unpaid), "text-tone-danger")}`, 3)}<div class="line-panel__toolbar worker-orders-filters"><button type="button" onclick="clearWorkerOrderDate()" class="worker-orders-filters__chip${!day ? " is-active" : ""}">Бүгд</button><button type="button" onclick="setWorkerOrderDate('${today}')" class="${todayBtnClass}"${todayPastDisabled ? " disabled" : ""}>Өнөөдөр</button><input type="date" value="${day}" onchange="setWorkerOrderDate(this.value)" onfocus="toolbarSelectFocus()" onblur="toolbarSelectBlur()" class="flex-1 min-w-[140px] px-3 py-2 bg-secondary rounded text-sm app-input"><select onchange="setWorkerPayFilter(this.value)"${pageToolbarSelectHandlers()} class="px-3 py-2 bg-secondary rounded text-sm app-input"><option value="all" ${pay === "all" ? "selected" : ""}>Бүгд</option><option value="paid" ${pay === "paid" ? "selected" : ""}>Төлсөн</option><option value="unpaid" ${pay === "unpaid" ? "selected" : ""}>Төлөөгүй</option></select></div><div class="line-list line-list--scroll">${orders.length ? orders.map((o) => `<button type="button" data-order-id="${esc(o.id)}" data-order-day="${orderCreatedDay(o)}" onclick="workerOrderDetail('${o.id}')" class="line-list__row${state.workerHighlightOrderId === o.id ? " line-list__row--new" : ""}"><div class="line-list__main"><div class="line-list__title-row">${receiptNo(o, "xs")}<span class="line-list__title">${esc(o.customerName)}</span><b class="line-list__amount">${fmt(orderAmount(o))}</b></div><p class="line-list__meta">Захиалга ${dte(o.createdAt)} · Хүргэлт ${dte(orderDeliveryDay(o))} · ${o.items.length} бараа · <span class="${o.paymentTerm === "credit" ? "text-tone-danger" : "text-tone-success"}">${paymentTermLabel(o.paymentTerm)}</span></p></div></button>`).join("") : `<p class="line-panel__empty">Захиалга байхгүй</p>`}</div></section>`;
}
function workerOrderDetail(id) {
  orderReceiptModal(id);
}
function render() {
  if (!window.__tomudaBooted) {
    if (!app.querySelector(".boot-screen")) app.innerHTML = bootScreenHtml();
    return;
  }
  if (isEditingCountQty()) {
    countRenderPending = true;
    if (localStateDirty()) scheduleBackendSave();
    return;
  }
  if (isWarehouseDateEditing()) {
    warehouseDateRenderPending = true;
    if (localStateDirty()) scheduleBackendSave();
    return;
  }
  if (isEditingSettlementText()) {
    settlementRenderPending = true;
    if (localStateDirty()) scheduleBackendSave();
    return;
  }
  if (!state.isLoggedIn && isLoginFormActive()) return;
  countRenderPending = false;
  warehouseDateRenderPending = false;
  settlementRenderPending = false;
  if (!state.isLoggedIn) {
    mountLoginView();
    return;
  }
  syncCurrentEmployeeFromState();
  const r = currentRole();
  if (!canAccessView(state.currentView, r)) {
    state.currentView = defaultViewForRole(r);
  }
  saveAuthSession();
  const map = {
    admin: adminView,
    orders: ordersView,
    customers: customersView,
    products: productsView,
    inventory: inventoryView,
    employees: employeesView,
    employeePermissions: employeePermissionsView,
    reports: reportsView,
    promotions: promotionsView,
    worker: workerView,
    warehouse: warehouseView,
    warehouseReceipts: warehouseReceiptsView,
    delivery: deliveryView,
    count: countView,
  };
  const view = map[state.currentView] || workerView;
  whReceiptPickerSkipAnim = isWhReceiptPickerOpen();
  const scrollSnap = captureRenderScroll();
  app.innerHTML = shell(view());
  lastRenderedView = state.currentView;
  restoreRenderScroll(scrollSnap);
  if (whReceiptPickerSkipAnim) {
    document
      .querySelectorAll(".wh-receipt-picker.is-open .wh-receipt-picker__panel")
      .forEach((panel) =>
        panel.classList.add("wh-receipt-picker__panel--steady"),
      );
  }
  bindProductImages(app);
  if (localStateDirty()) scheduleBackendSave();
  maybeShowPwaInstallBanner();
  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    requestAnimationFrame(() => {
      initDeliveryRouteMap(deliveryStoresWithOrders(), state.deliveryStoreId);
    });
  } else {
    destroyDeliveryMap();
  }
  if (state.currentView === "warehouseReceipts" && !isWhReceiptPickerOpen())
    scrollWarehouseReceiptListToActive();
  bindReceiptPrintWorkerPickerDismiss();
  if (state.currentView === "count" && !state.countDone)
    syncCountInputsFromState();
  requestAnimationFrame(() => {
    enhanceMobileNumericInputs(document);
    permApi()?.syncAllPermissionRowDeps?.();
    bindProductImages(document);
    syncSettlementInputHeights(app);
    bindScrollTopFab();
  });
}
function box(title, body, max = "max-w-2xl", opts = {}) {
  const titleId = opts.titleId || "modal-title",
    dialogAttr = opts.dialog
      ? ` role="dialog" aria-modal="true" aria-labelledby="${titleId}"`
      : "",
    closeLabel = esc(opts.closeLabel || "Цонхыг хаах"),
    titleHtml = opts.titleHtml ? title : esc(title),
    panelExtra = opts.panelClass ? ` ${opts.panelClass}` : "";
  const wasOpen = !!modal.innerHTML.trim();
  const modalScrollTop = wasOpen
    ? (modal.querySelector(".modal-scroll")?.scrollTop ?? 0)
    : 0;
  modal.innerHTML = `<div class="modal-backdrop fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-modal-backdrop><div class="modal-panel bg-card rounded w-full ${max} max-h-[90vh] overflow-hidden shadow-lg${panelExtra}"${dialogAttr}><div class="modal-panel__head p-4 sm:p-6 border-b border-border flex justify-between items-center gap-3"><h3 id="${titleId}" class="modal-panel__title text-lg font-semibold">${titleHtml}</h3><button type="button" onclick="closeModal()" class="modal-close btn btn--secondary btn--sm" aria-label="${closeLabel}"><span aria-hidden="true">✕</span></button></div>${body}</div></div>`;
  requestAnimationFrame(() => {
    enhanceMobileNumericInputs(document);
    bindProductImages(document);
    if (wasOpen && modalScrollTop > 0) {
      const scroll = modal.querySelector(".modal-scroll");
      if (scroll) scroll.scrollTop = modalScrollTop;
    }
  });
  if (!wasOpen) pushAppHistory();
}
const IMAGE_LIGHTBOX_SKIP =
  ".receipt-logo, .boot-screen__logo, .wh-receipt-sheet__logo, .auth-card__logo, .tomuda-logo, #image-lightbox img";
let imageLightboxEl = null;
function imageLightboxOpen() {
  return imageLightboxEl && !imageLightboxEl.hidden;
}
function isZoomableImage(img) {
  if (!img?.src || img.tagName !== "IMG") return false;
  if (img.closest(IMAGE_LIGHTBOX_SKIP)) return false;
  return !!img.closest(
    "#app, #modal, .picker-qty-sheet, [data-picker-qty-sheet]",
  );
}
function ensureImageLightbox() {
  if (imageLightboxEl) return imageLightboxEl;
  imageLightboxEl = document.createElement("div");
  imageLightboxEl.id = "image-lightbox";
  imageLightboxEl.className = "image-lightbox";
  imageLightboxEl.hidden = true;
  imageLightboxEl.innerHTML =
    '<button type="button" class="image-lightbox__backdrop" data-image-lightbox-close aria-label="Хаах"></button><div class="image-lightbox__frame" role="dialog" aria-modal="true" aria-label="Зураг"><img class="image-lightbox__img" alt=""><button type="button" class="image-lightbox__close btn btn--secondary btn--sm" data-image-lightbox-close aria-label="Хаах"><span aria-hidden="true">✕</span></button></div>';
  document.body.appendChild(imageLightboxEl);
  imageLightboxEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-image-lightbox-close]")) closeImageLightbox();
  });
  return imageLightboxEl;
}
function openImageLightbox(src, alt = "") {
  const root = ensureImageLightbox();
  const img = root.querySelector(".image-lightbox__img");
  if (img) {
    img.src = src;
    img.alt = alt;
  }
  root.hidden = false;
  document.body.classList.add("image-lightbox-open");
}
function closeImageLightbox() {
  if (!imageLightboxEl || imageLightboxEl.hidden) return;
  imageLightboxEl.hidden = true;
  document.body.classList.remove("image-lightbox-open");
  const img = imageLightboxEl.querySelector(".image-lightbox__img");
  if (img) img.removeAttribute("src");
}
function initProductImageFallback() {
  if (document.documentElement.dataset.productImgFallbackBound) return;
  document.documentElement.dataset.productImgFallbackBound = "1";
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img?.tagName !== "IMG" || !img.dataset.productImg) return;
      const failed = productImageUrlKey(img.currentSrc || img.src);
      if (failed) brokenProductImageUrls.add(failed);
      if (img.dataset.imgFallbackReady === "1") return;
      const candidates = productImageFallbackList(findProductForImage(img));
      const next = Number(img.dataset.imgFallbackIdx || "0") + 1;
      if (next < candidates.length) {
        img.dataset.imgFallbackIdx = String(next);
        img.src = candidates[next];
      } else if (candidates.length) {
        img.dataset.imgFallbackIdx = "0";
        img.src = candidates[0];
      }
    },
    true,
  );
}
function initImageLightbox() {
  if (document.documentElement.dataset.imageLightboxBound) return;
  document.documentElement.dataset.imageLightboxBound = "1";
  document.addEventListener(
    "click",
    (e) => {
      const img = e.target.closest("img");
      if (!img || !isZoomableImage(img)) return;
      e.preventDefault();
      e.stopPropagation();
      openImageLightbox(img.currentSrc || img.src, img.alt || "");
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageLightboxOpen()) closeImageLightbox();
  });
}
function closeModal() {
  closeConfirmCard();
  stopBarcodeScan();
  if (state.pickerActiveId) finishPickerEditFor(state.pickerActiveId);
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  destroyCustomerMap();
  state.promoPick = null;
  state.promoFormDraft = null;
  state.customerFormDraft = null;
  state.searches.deliveryPick = "";
  const deliveryTrigger = document.getElementById("warehouse-delivery-trigger");
  if (deliveryTrigger) deliveryTrigger.setAttribute("aria-expanded", "false");
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  clearReceiptEdit();
  const syncWorkerSelect = !!document.querySelector(
    "[data-worker-select-modal]",
  );
  modal.innerHTML = "";
  if (syncWorkerSelect) render();
}
function destroyCustomerMap() {
  if (window.customerMapInitTimer) {
    clearTimeout(window.customerMapInitTimer);
    window.customerMapInitTimer = null;
  }
  if (window.customerMapResizeTimer) {
    clearTimeout(window.customerMapResizeTimer);
    window.customerMapResizeTimer = null;
  }
  cleanupCustomerMapInstance();
  const el = document.getElementById("customerMap");
  if (el) {
    el.removeAttribute("data-leaflet-id");
    el._leaflet_id = undefined;
    el.innerHTML = "";
  }
}
function cleanupCustomerMapInstance() {
  if (window.customerMap?.remove) {
    try {
      window.customerMap.off();
      window.customerMap.remove();
    } catch (e) {}
  }
  window.customerMap = null;
  window.customerMapMarker = null;
  window.customerUserMarker = null;
  window.customerUserAccuracy = null;
  window.customerUserCoords = null;
  window.customerTileLayer = null;
  window.customerTileFallback = false;
}
let tomudaGeolocationPlugin = null;
function isCapacitorNative() {
  return !!window.Capacitor?.isNativePlatform?.();
}
function capGeolocationPlugin() {
  if (!isCapacitorNative()) return null;
  if (tomudaGeolocationPlugin) return tomudaGeolocationPlugin;
  if (window.TomudaGeolocation) {
    tomudaGeolocationPlugin = window.TomudaGeolocation;
    return tomudaGeolocationPlugin;
  }
  const cap = window.Capacitor;
  if (cap?.Plugins?.Geolocation) {
    tomudaGeolocationPlugin = cap.Plugins.Geolocation;
    return tomudaGeolocationPlugin;
  }
  return null;
}
async function waitForCapGeolocationPlugin(attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    if (typeof window.__initTomudaGeolocation === "function") {
      window.__initTomudaGeolocation();
    }
    const plugin = capGeolocationPlugin();
    if (plugin) return plugin;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}
function geolocationPermissionGranted(perm = {}) {
  const ok = (value) => {
    const state = String(value || "").toLowerCase();
    return state === "granted" || state === "limited";
  };
  return ok(perm.location) || ok(perm.coarseLocation);
}
function geolocationPermissionDenied(perm = {}) {
  if (geolocationPermissionGranted(perm)) return false;
  const loc = String(perm.location || "").toLowerCase();
  const coarse = String(perm.coarseLocation || "").toLowerCase();
  return loc === "denied" || coarse === "denied";
}
function normalizeGeolocationError(err) {
  if (!err) return Object.assign(new Error("geolocation"), { code: 2 });
  const msg = String(err.message || err.errorMessage || "").toLowerCase();
  const capCode = String(err.code || "");
  const normalized =
    err instanceof Error ? err : new Error(msg || "geolocation error");
  if (
    capCode.includes("OS-PLUG-GLOC-0003") ||
    capCode.includes("OS-PLUG-GLOC-0009")
  ) {
    normalized.code = 1;
    return normalized;
  }
  if (
    capCode.includes("OS-PLUG-GLOC-0007") ||
    capCode.includes("OS-PLUG-GLOC-0016") ||
    capCode.includes("OS-PLUG-GLOC-0017")
  ) {
    normalized.code = 2;
    return normalized;
  }
  if (capCode.includes("OS-PLUG-GLOC-0010")) {
    normalized.code = 3;
    return normalized;
  }
  if (normalized.code == null) {
    if (msg.includes("denied") || msg.includes("permission"))
      normalized.code = 1;
    else if (
      msg.includes("disabled") ||
      msg.includes("not enabled") ||
      msg.includes("unavailable") ||
      msg.includes("provider") ||
      msg.includes("turned off")
    )
      normalized.code = 2;
    else if (msg.includes("timeout") || msg.includes("in time"))
      normalized.code = 3;
    else if (msg.includes("unsupported") || msg.includes("plugin missing"))
      normalized.code = 0;
    else normalized.code = 2;
  }
  return normalized;
}
function isAndroidDevice() {
  const cap = window.Capacitor;
  if (cap?.getPlatform?.() === "android") return true;
  return /android/i.test(navigator.userAgent || "");
}
function isSamsungDevice() {
  return /samsung|sm-/i.test(navigator.userAgent || "");
}
function geolocationErrorDetail(err) {
  const code = err?.code;
  const msg = String(err?.message || err?.errorMessage || "").toLowerCase();
  if (!window.isSecureContext && location.protocol !== "https:") {
    return {
      text: "Байршил авахын тулд HTTPS холболт шаардлагатай",
      offerSettings: false,
    };
  }
  if (
    code === 2 ||
    msg.includes("disabled") ||
    msg.includes("location service") ||
    msg.includes("location provider") ||
    msg.includes("turn on")
  ) {
    return {
      text: isSamsungDevice()
        ? "Samsung-ийн Байршил (Location) унтраалттай байна. Тохиргооноос асаана уу."
        : "Утасны GPS/Байршил унтраалттай байна. Тохиргооноос асаана уу.",
      offerSettings: isAndroidDevice(),
    };
  }
  if (code === 1 || msg.includes("denied") || msg.includes("permission")) {
    return {
      text: isSamsungDevice()
        ? "Байршил авах зөвшөөрөл байхгүй. Тохиргоо → Байршил → Асаах, мөн app-д зөвшөөрнө үү."
        : "Байршил авахын тулд GPS зөвшөөрөл өгнө үү (тохиргоо).",
      offerSettings: isAndroidDevice(),
    };
  }
  if (code === 3 || msg.includes("timeout")) {
    return {
      text: "Байршил хэт удаан. GPS-ийг идэвхтэй эсэхийг шалгаад дахин оролдоно уу.",
      offerSettings: isAndroidDevice(),
    };
  }
  if (
    code === 0 ||
    msg.includes("unsupported") ||
    msg.includes("plugin missing")
  ) {
    return {
      text: isCapacitorNative()
        ? "GPS plugin олдсонгүй. App-аа шинэчилж (APK) дахин суулгана уу."
        : "Энэ төхөөрөмж GPS дэмжихгүй байна",
      offerSettings: false,
    };
  }
  return {
    text: "Байршил авахад алдаа гарлаа",
    offerSettings: isAndroidDevice(),
  };
}
function geolocationErrorMessage(err) {
  return geolocationErrorDetail(err).text;
}
function tryAndroidLocationSettingsIntent() {
  const intents = [
    "intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=mn.tomuda.commerce;end",
    "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end",
    "intent:#Intent;action=android.settings.LOCATION_SETTINGS;end",
  ];
  if (isSamsungDevice()) {
    intents.unshift(
      "intent:#Intent;package=com.android.settings;component=com.android.settings/com.samsung.android.settings.location.LocationSettings;end",
    );
  }
  for (const href of intents) {
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        window.location.href = href;
        return true;
      }
      const link = document.createElement("a");
      link.href = href;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 500);
      return true;
    } catch (e) {}
  }
  return false;
}
function openDeviceLocationSettings() {
  if (isAndroidDevice() && tryAndroidLocationSettingsIntent()) return;
  alertModal(
    "Байршил асаах",
    isSamsungDevice()
      ? `<p>Samsung дээр дараах байдлаар байршилаа асаана уу:</p><ol class="list-decimal pl-5 space-y-1 text-sm mt-2"><li><b>Тохиргоо</b> (Settings) нээнэ</li><li><b>Байршил</b> (Location) сонгоно</li><li><b>Асаах</b> (On) болгоно</li><li>ТОМУДА app-д <b>Зөвшөөрөх</b> сонгоно</li><li>App руу буцаж <b>Миний байршил</b> дарна</li></ol>`
      : `<p>Утасныхаа <b>Тохиргоо → Байршил</b> хэсэгт GPS-ээ асаагаад app-д зөвшөөрөл өгнө үү.</p>`,
  );
}
function showCustomerLocationFailure(err) {
  const status = document.getElementById("customerMapStatus");
  const settingsBtn = document.getElementById("customerMapSettingsBtn");
  const detail = geolocationErrorDetail(err);
  if (status) status.textContent = detail.text;
  if (settingsBtn) {
    settingsBtn.hidden = !detail.offerSettings;
    settingsBtn.classList.toggle("hidden", !detail.offerSettings);
  }
  if (detail.offerSettings) {
    confirmModal(
      "Байршил асаах",
      `<p>${detail.text}</p><p class="text-sm text-muted-foreground mt-2">${isSamsungDevice() ? "Samsung" : "Android"}-ийн <b>Тохиргоо → Байршил</b> хэсэг рүү шилжиж GPS-ээ асаана уу.</p>`,
      {
        confirmLabel: "Тохиргоо нээх",
        cancelLabel: "Болих",
        closable: true,
        onConfirm: () => {
          closeConfirmCard();
          openDeviceLocationSettings();
        },
      },
    );
  }
}
function hideCustomerLocationSettingsPrompt() {
  const settingsBtn = document.getElementById("customerMapSettingsBtn");
  if (settingsBtn) {
    settingsBtn.hidden = true;
    settingsBtn.classList.add("hidden");
  }
}
function normalizeDeviceCoords(raw = {}) {
  const coords = raw.coords || raw;
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const err = new Error("invalid");
    err.code = 2;
    throw err;
  }
  return {
    latitude,
    longitude,
    accuracy: Number(coords.accuracy) || 0,
  };
}
function readBrowserGeolocation(options, onSuccess, onError) {
  if (!navigator.geolocation) {
    onError(Object.assign(new Error("unsupported"), { code: 0 }));
    return null;
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  return true;
}
function readBrowserGeolocationWithWatch(options, onSuccess, onError) {
  if (!navigator.geolocation) {
    onError(Object.assign(new Error("unsupported"), { code: 0 }));
    return null;
  }
  let settled = false;
  const finish = (fn, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    fn(value);
  };
  let watchId = null;
  const timer = setTimeout(
    () => {
      finish(onError, Object.assign(new Error("timeout"), { code: 3 }));
    },
    Number(options.timeout || 25000) + 2000,
  );
  watchId = navigator.geolocation.watchPosition(
    (pos) => finish(onSuccess, pos),
    (err) => finish(onError, err),
    options,
  );
  return watchId;
}
function readBrowserGeolocationWatchPromise(options = {}) {
  const high = {
    enableHighAccuracy: true,
    timeout: 35000,
    maximumAge: 0,
    ...options,
  };
  const low = {
    enableHighAccuracy: false,
    timeout: 45000,
    maximumAge: 120000,
    ...options,
  };
  return new Promise((resolve, reject) => {
    readBrowserGeolocationWithWatch(
      high,
      (pos) => resolve(normalizeDeviceCoords(pos)),
      (err) => {
        if (err?.code === 1) {
          reject(err);
          return;
        }
        readBrowserGeolocationWithWatch(
          low,
          (pos) => resolve(normalizeDeviceCoords(pos)),
          reject,
        );
      },
    );
  });
}
function readBrowserGeolocationPromise(options = {}) {
  const geoOpts = {
    enableHighAccuracy: true,
    timeout: 35000,
    maximumAge: 0,
    ...options,
  };
  return new Promise((resolve, reject) => {
    readBrowserGeolocation(
      geoOpts,
      (pos) => resolve(normalizeDeviceCoords(pos)),
      (err) => {
        if (err?.code === 3 || err?.code === 2) {
          readBrowserGeolocation(
            {
              ...geoOpts,
              enableHighAccuracy: false,
              timeout: 45000,
              maximumAge: 120000,
            },
            (pos) => resolve(normalizeDeviceCoords(pos)),
            reject,
          );
          return;
        }
        reject(err);
      },
    );
  });
}
function readBrowserGeolocationForDevice(options = {}) {
  if (isAndroidDevice()) return readBrowserGeolocationWatchPromise(options);
  return readBrowserGeolocationPromise(options);
}
async function ensureCapacitorGeolocationPermission(capGeo) {
  if (!capGeo) return;
  if (typeof capGeo.checkPermissions === "function") {
    const current = await capGeo.checkPermissions().catch(() => null);
    if (current && geolocationPermissionGranted(current)) return;
  }
  if (typeof capGeo.requestPermissions !== "function") return;
  const perm = await capGeo.requestPermissions().catch(() => null);
  if (perm && geolocationPermissionDenied(perm)) {
    const denied = new Error("denied");
    denied.code = 1;
    throw denied;
  }
}
async function readCapacitorPosition(
  capGeo,
  options = {},
  { androidFirst = false } = {},
) {
  const geo = capGeo || (await waitForCapGeolocationPlugin());
  if (!geo) {
    const missing = new Error("Capacitor Geolocation plugin missing");
    missing.code = 0;
    throw missing;
  }
  const attempts = androidFirst
    ? [
        {
          enableHighAccuracy: false,
          timeout: 25000,
          maximumAge: 60000,
          enableLocationFallback: true,
          ...options,
        },
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 0,
          enableLocationFallback: true,
          ...options,
        },
      ]
    : [
        {
          enableHighAccuracy: true,
          timeout: 35000,
          maximumAge: 0,
          enableLocationFallback: true,
          ...options,
        },
        {
          enableHighAccuracy: false,
          timeout: 45000,
          maximumAge: 120000,
          enableLocationFallback: true,
          ...options,
        },
      ];
  let lastErr = null;
  for (const geoOpts of attempts) {
    try {
      const pos = await geo.getCurrentPosition({
        enableHighAccuracy: geoOpts.enableHighAccuracy,
        timeout: geoOpts.timeout,
        maximumAge: geoOpts.maximumAge,
        enableLocationFallback: geoOpts.enableLocationFallback !== false,
      });
      return normalizeDeviceCoords(pos);
    } catch (err) {
      lastErr = normalizeGeolocationError(err);
      if (lastErr.code === 1) throw lastErr;
    }
  }
  throw lastErr || Object.assign(new Error("timeout"), { code: 3 });
}
async function requestCapacitorPosition(options = {}) {
  const capGeo = await waitForCapGeolocationPlugin();
  if (!capGeo) {
    const missing = new Error("Capacitor Geolocation plugin missing");
    missing.code = 0;
    throw missing;
  }
  return readCapacitorPosition(capGeo, options, {
    androidFirst: isAndroidDevice(),
  });
}
async function requestDevicePosition(options = {}) {
  const androidNative = isCapacitorNative() && isAndroidDevice();

  if (androidNative) {
    const capGeo = await waitForCapGeolocationPlugin();
    if (!capGeo) {
      const missing = new Error("Capacitor Geolocation plugin missing");
      missing.code = 0;
      throw missing;
    }
    try {
      return await readCapacitorPosition(capGeo, options, {
        androidFirst: true,
      });
    } catch (nativeErr) {
      const normalized = normalizeGeolocationError(nativeErr);
      if (navigator.geolocation && normalized.code !== 1) {
        try {
          return await readBrowserGeolocationForDevice(options);
        } catch (browserErr) {
          throw normalized.code !== 2
            ? normalized
            : normalizeGeolocationError(browserErr);
        }
      }
      throw normalized;
    }
  }

  const capGeo = isCapacitorNative()
    ? await waitForCapGeolocationPlugin()
    : null;
  let lastErr = null;

  if (navigator.geolocation) {
    try {
      return await readBrowserGeolocationForDevice(options);
    } catch (err) {
      lastErr = normalizeGeolocationError(err);
      if (lastErr.code === 1 && !capGeo) throw lastErr;
    }
  }

  if (capGeo) {
    try {
      return await readCapacitorPosition(capGeo, options);
    } catch (err) {
      lastErr = normalizeGeolocationError(err);
      throw lastErr;
    }
  }

  if (!navigator.geolocation) {
    return Promise.reject(Object.assign(new Error("unsupported"), { code: 0 }));
  }
  throw lastErr || Object.assign(new Error("timeout"), { code: 3 });
}
function waitForCustomerMap(callback, attempt = 0) {
  if (window.customerMap) {
    callback();
    return;
  }
  if (attempt >= 50) return;
  setTimeout(() => waitForCustomerMap(callback, attempt + 1), 120);
}
function applyCustomerCoords(
  coords,
  { setPin = false, hasCustomerPin = false } = {},
) {
  const status = document.getElementById("customerMapStatus");
  const la = coords.latitude,
    ln = coords.longitude;
  window.customerUserCoords = [la, ln];
  showCustomerUserMarker(la, ln, coords.accuracy);
  const shouldPin = setPin || !hasCustomerPin;
  if (shouldPin) {
    setCustomerMapPoint(la, ln, "Таны байршил");
    window.customerMap.setView([la, ln], 16);
  } else {
    window.customerMap.setView(
      [la, ln],
      Math.max(window.customerMap.getZoom(), 15),
    );
    if (status) status.textContent = "Таны байршил хараглаа";
  }
  hideCustomerLocationSettingsPrompt();
}
function setCustomerMapPoint(la, ln, label = "") {
  const latInput = document.getElementById("customerLat"),
    lngInput = document.getElementById("customerLng"),
    status = document.getElementById("customerMapStatus");
  if (!window.customerMap || !window.L) return;
  const fixedLat = Number(la).toFixed(6),
    fixedLng = Number(ln).toFixed(6);
  if (latInput) latInput.value = fixedLat;
  if (lngInput) lngInput.value = fixedLng;
  if (window.customerMapMarker)
    window.customerMapMarker.setLatLng([fixedLat, fixedLng]);
  else
    window.customerMapMarker = window.L.marker([fixedLat, fixedLng]).addTo(
      window.customerMap,
    );
  if (status) status.textContent = label || `Pin: ${fixedLat}, ${fixedLng}`;
}
function showCustomerUserMarker(la, ln, accuracy) {
  if (!window.customerMap || !window.L) return;
  if (window.customerUserMarker) window.customerUserMarker.remove();
  window.customerUserMarker = window.L.marker([la, ln], {
    icon: window.L.divIcon({
      className: "customer-map-user-marker",
      html: '<div class="customer-map-user-marker__pulse"></div><div class="customer-map-user-marker__dot"></div><div class="customer-map-user-marker__label">Та энд</div>',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    }),
    zIndexOffset: 1200,
    interactive: false,
  }).addTo(window.customerMap);
  if (window.customerUserAccuracy) window.customerUserAccuracy.remove();
  if (accuracy && accuracy < 500) {
    window.customerUserAccuracy = window.L.circle([la, ln], {
      radius: accuracy,
      color: "#16899a",
      fillColor: "#16899a",
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(window.customerMap);
  }
}
function applyCustomerUserPosition({
  setPin = false,
  hasCustomerPin = false,
} = {}) {
  const status = document.getElementById("customerMapStatus");
  if (!window.customerMap) {
    if (status) status.textContent = "Газрын зураг ачаалж байна...";
    return Promise.resolve();
  }
  if (!isCapacitorNative() && !navigator.geolocation) {
    if (status && (!hasCustomerPin || setPin))
      status.textContent = "Энэ төхөөрөмж GPS дэмжихгүй байна";
    return Promise.resolve();
  }
  if (status && (setPin || !hasCustomerPin))
    status.textContent = "Байршил татаж байна...";
  return requestDevicePosition()
    .then((coords) => {
      if (!window.customerMap) return;
      applyCustomerCoords(coords, { setPin, hasCustomerPin });
    })
    .catch((err) => {
      const normalized = normalizeGeolocationError(err);
      if (status && (!hasCustomerPin || setPin))
        status.textContent = geolocationErrorMessage(normalized);
      if (setPin) showCustomerLocationFailure(normalized);
    });
}
async function showCustomerUserLocation(
  hasCustomerPin,
  { setPin = false } = {},
) {
  return applyCustomerUserPosition({ setPin, hasCustomerPin });
}
function centerCustomerMapOnUser() {
  const status = document.getElementById("customerMapStatus");
  const latInput = document.getElementById("customerLat"),
    lngInput = document.getElementById("customerLng");
  const hasPin = !!(latInput?.value && lngInput?.value);
  const onFail = (err) => {
    showCustomerLocationFailure(normalizeGeolocationError(err));
  };
  const onCoords = (coords) => {
    const apply = () => {
      applyCustomerCoords(coords, { setPin: true, hasCustomerPin: hasPin });
      scheduleCustomerMapResize();
    };
    if (!window.customerMap) {
      waitForCustomerMap(() => {
        if (!window.customerMap) {
          onFail(Object.assign(new Error("map unavailable"), { code: 2 }));
          return;
        }
        apply();
      });
      return;
    }
    apply();
  };
  if (!isCapacitorNative() && !navigator.geolocation) {
    if (status) status.textContent = "Энэ төхөөрөмж GPS дэмжихгүй байна";
    return;
  }
  if (status) status.textContent = "Байршил татаж байна...";
  const run = () => {
    requestDevicePosition({
      enableHighAccuracy: true,
      timeout: 35000,
      maximumAge: 0,
    })
      .then(onCoords)
      .catch(onFail);
  };
  if (!window.customerMap) waitForCustomerMap(run);
  else run();
}
function bindCustomerMapLocateButton() {
  const btn = document.querySelector(".customer-map-locate");
  if (!btn || btn.dataset.geoBound) return;
  btn.dataset.geoBound = "1";
  btn.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      centerCustomerMapOnUser();
    },
    { passive: false },
  );
}
function bindCustomerMapSettingsButton() {
  const btn = document.getElementById("customerMapSettingsBtn");
  if (!btn || btn.dataset.geoBound) return;
  btn.dataset.geoBound = "1";
  btn.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openDeviceLocationSettings();
    },
    { passive: false },
  );
}
function scheduleCustomerMapResize() {
  const fix = () => {
    if (window.customerMap) window.customerMap.invalidateSize(true);
  };
  fix();
  requestAnimationFrame(fix);
  clearTimeout(window.customerMapResizeTimer);
  window.customerMapResizeTimer = setTimeout(fix, 150);
  setTimeout(fix, 350);
}
function inputAttrs(
  value,
  placeholder = "",
  { treatZeroAsEmpty = false } = {},
) {
  const v = value === null || value === undefined ? "" : String(value);
  const ph = placeholder || "";
  const empty = v === "" || (treatZeroAsEmpty && v === "0");
  if (empty) return ph ? `placeholder="${esc(ph)}"` : "";
  return `value="${esc(v)}"${ph ? ` placeholder="${esc(ph)}"` : ""}`;
}
function mobileInputKeyboardAttrs(type, name = "", { decimal = false } = {}) {
  const key = String(name || "").toLowerCase();
  if (type === "number" || decimal) {
    return decimal
      ? 'type="tel" inputmode="decimal" autocomplete="off"'
      : 'type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off"';
  }
  if (type === "tel" || key.includes("phone")) {
    return 'type="tel" inputmode="tel" autocomplete="tel"';
  }
  return `type="${type}"`;
}
function enhanceMobileNumericInputs(root = document) {
  const scope = root.querySelector("#app") || root.getElementById?.("app");
  const modalRoot =
    root.querySelector("#modal") || root.getElementById?.("modal");
  [scope, modalRoot].filter(Boolean).forEach((container) => {
    container.querySelectorAll('input[type="number"]').forEach((el) => {
      const decimal = el.step && String(el.step).includes(".");
      el.type = "tel";
      el.inputMode = decimal ? "decimal" : "numeric";
      if (!decimal) el.pattern = "[0-9]*";
      el.autocomplete = "off";
    });
    container
      .querySelectorAll(
        'input[name="barcode"], input[data-promo-digits="1"], input[data-count-product-id], input[data-receipt-qty], input.qty-stepper__input, input.count-row__input',
      )
      .forEach((el) => {
        if (el.type === "password" || el.type === "email") return;
        el.type = "tel";
        el.inputMode = "numeric";
        el.pattern = "[0-9]*";
        el.autocomplete = "off";
      });
    container.querySelectorAll('input[name*="phone" i]').forEach((el) => {
      if (el.type === "password" || el.type === "email") return;
      el.type = "tel";
      el.inputMode = "tel";
      el.autocomplete = "tel";
    });
  });
}
function field(name, label, value = "", type = "text", placeholder = "") {
  const ph = placeholder || label;
  const isNumber = type === "number";
  const attrs = inputAttrs(value, ph, { treatZeroAsEmpty: isNumber });
  const kb = mobileInputKeyboardAttrs(type, name);
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><input name="${name}" ${kb} ${attrs} class="w-full px-4 py-3 bg-secondary rounded app-input"></label>`;
}
function customerRegistrationField(value = "") {
  const attrs = inputAttrs(value, "Регистрийн дугаар");
  return `<label><span class="block text-sm font-medium mb-2">Регистрийн дугаар</span><input id="customerRegistrationInput" name="registrationNumber" type="text" inputmode="text" autocomplete="off" ${attrs} oninput="scheduleCustomerRegistryLookup(this.value)" onblur="fillCustomerFromRegistration(this.value)" class="w-full px-4 py-3 bg-secondary rounded app-input"><p id="customerRegistryLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>`;
}
function customerProvinceField(value = "") {
  const selected = (value || "").trim() || "Улаанбаатар";
  const options = MN_PROVINCES.map(
    (p) =>
      `<option value="${esc(p)}" ${selected === p ? "selected" : ""}>${esc(p)}</option>`,
  ).join("");
  return `<label><span class="block text-sm font-medium mb-2">Аймаг/Хот</span><select name="province" onchange="onCustomerProvinceChange()" class="w-full px-4 py-3 bg-secondary rounded app-input customer-province-select">${options}</select></label>`;
}
function captureCustomerForm() {
  const form = modal.querySelector("form[data-customer-form]");
  if (!form) return null;
  const fd = new FormData(form);
  const data = Object.fromEntries(fd);
  applyCustomerPhoneFields(data, customerPhonesFromFormData(fd));
  data.latitude =
    document.getElementById("customerLat")?.value || data.latitude || "";
  data.longitude =
    document.getElementById("customerLng")?.value || data.longitude || "";
  return data;
}
function customerFromDraft(id, draft) {
  const saved = state.customers.find((x) => x.id === id) || {};
  if (!draft) return { ...saved };
  const next = {
    ...saved,
    name: draft.name ?? saved.name,
    registrationNumber: draft.registrationNumber ?? saved.registrationNumber,
    companyName: draft.companyName ?? saved.companyName,
    province: draft.province ?? saved.province,
    district: draft.district ?? saved.district,
    khoroo: draft.khoroo ?? saved.khoroo,
    address: draft.address ?? saved.address,
    image: draft.image ?? saved.image,
    latitude: draft.latitude ?? saved.latitude,
    longitude: draft.longitude ?? saved.longitude,
    locationText: draft.locationText ?? saved.locationText,
  };
  if (
    Array.isArray(draft.phones) ||
    draft.phone1 != null ||
    draft.phone2 != null
  ) {
    applyCustomerPhoneFields(
      next,
      Array.isArray(draft.phones)
        ? draft.phones
        : customerPhonesList({
            phones: draft.phones,
            phone1: draft.phone1 ?? saved.phone1,
            phone2: draft.phone2 ?? saved.phone2,
          }),
    );
  }
  return next;
}
function confirmEditCustomer(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return alert("Харилцагч олдсонгүй");
  const name = c.name || c.companyName || "Харилцагч";
  confirmModal("Харилцагч засах", `<p><b>${esc(name)}</b> засах уу?</p>`, {
    confirmLabel: "Тийм",
    closable: true,
    onConfirm: () => {
      closeModal();
      customerModal(id);
    },
  });
}
function confirmEditProduct(id) {
  if (!hasPermission("products.edit")) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return alert("Бараа олдсонгүй");
  confirmModal(
    "Бараа засах",
    `<p><b>${esc(p.name || "Бараа")}</b> засах уу?</p>`,
    {
      confirmLabel: "Тийм",
      closable: true,
      onConfirm: () => productModal(id),
    },
  );
}
function confirmEditEmployee(id) {
  if (!hasPermission("employees.edit")) return;
  const e = state.employees.find((x) => x.id === id);
  if (!e) return alert("Ажилтан олдсонгүй");
  confirmModal(
    "Ажилтан засах",
    `<p><b>${esc(e.name || "Ажилтан")}</b> засах уу?</p>`,
    {
      confirmLabel: "Тийм",
      closable: true,
      onConfirm: () => employeeModal(id),
    },
  );
}
function customerModal(id, draft = null) {
  destroyCustomerMap();
  const useDraft = draft || null;
  if (useDraft)
    state.customerFormDraft = {
      ...useDraft,
      customerId: id || useDraft.customerId || "",
    };
  else state.customerFormDraft = null;
  const c = customerFromDraft(id, useDraft);
  const cid = esc(id || "");
  const receivableHost = id
    ? `<div data-customer-receivable-host>${customerEditReceivableSectionHtml(id)}</div>`
    : "";
  box(
    id ? "Харилцагч засах" : "Харилцагч бүртгэх",
    `<form data-customer-form data-customer-id="${cid}" onsubmit="saveCustomer(event,'${cid}')" class="p-6 space-y-4 modal-scroll overflow-y-auto">${customerImageField(c)}${receivableHost}<div class="grid sm:grid-cols-2 gap-4">${field("name", "Нэр", c.name)}${customerRegistrationField(c.registrationNumber)}</div>${field("companyName", "Байгууллагын нэр", c.companyName)}${customerPhonesFieldsHtml(c)}<div class="grid sm:grid-cols-2 gap-4">${customerProvinceField(c.province)}${customerDistrictFieldHtml(c.province, c.district)}</div>${customerKhorooFieldHtml(c.province, c.district, c.khoroo)}${field("address", "Дэлгэрэнгүй хаяг", c.address)}<div><div class="customer-map-head"><span class="block text-sm font-medium">Байршил</span><div class="customer-map-head__actions"><button type="button" class="customer-map-locate">📍 Миний байршил</button><button type="button" id="customerMapSettingsBtn" class="customer-map-settings-btn hidden" hidden>⚙️ Байршил асаах</button><span id="customerMapStatus" class="text-xs text-muted-foreground"></span></div></div><div id="customerMap" class="customer-map" style="height:360px;min-height:360px;width:100%;display:block;"></div></div><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Өргөрөг</span><input id="customerLat" name="latitude" value="${esc(c.latitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label><label><span class="block text-sm font-medium mb-2">Уртраг</span><input id="customerLng" name="longitude" value="${esc(c.longitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label></div><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-3xl",
  );
  initCustomerImageField(c);
  window.customerMapInitTimer = setTimeout(() => {
    window.customerMapInitTimer = null;
    initCustomerMap(c.latitude, c.longitude);
  }, 120);
  requestAnimationFrame(() => {
    bindCustomerMapLocateButton();
    bindCustomerMapSettingsButton();
  });
  loadMnLocations().then(() => {
    if (modal.querySelector("form[data-customer-form]"))
      initCustomerAddressFields(c);
  });
  loadLesRegistryIndex();
}
function loadLeaflet(cb) {
  if (window.L) return cb();
  if (window.leafletLoading) {
    setTimeout(() => loadLeaflet(cb), 200);
    return;
  }
  window.leafletLoading = true;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/static/tomuda/vendor/leaflet/leaflet.css";
  document.head.appendChild(css);
  const script = document.createElement("script");
  script.src = "/static/tomuda/vendor/leaflet/leaflet.js";
  script.onload = () => {
    window.leafletLoading = false;
    cb();
  };
  script.onerror = () => {
    window.leafletLoading = false;
    const el = document.getElementById("customerMap");
    if (el)
      el.innerHTML = `<div class="h-full grid place-items-center text-sm text-muted-foreground bg-secondary rounded">Map сүлжээнээс ачаалж чадсангүй</div>`;
  };
  document.body.appendChild(script);
}
function initCustomerMap(lat, lng) {
  const el = document.getElementById("customerMap"),
    latInput = document.getElementById("customerLat"),
    lngInput = document.getElementById("customerLng"),
    status = document.getElementById("customerMapStatus");
  if (!el) return;
  if (!window.L) {
    el.innerHTML = `<div class="h-full grid place-items-center text-sm text-muted-foreground bg-secondary rounded">Map ачаалж байна...</div>`;
    loadLeaflet(() => initCustomerMap(lat, lng));
    return;
  }
  cleanupCustomerMapInstance();
  if (!document.getElementById("customerMap")) return;
  const mapEl = document.getElementById("customerMap");
  mapEl.removeAttribute("data-leaflet-id");
  mapEl._leaflet_id = undefined;
  mapEl.innerHTML = "";
  const has =
      lat !== undefined &&
      lng !== undefined &&
      lat !== "" &&
      lng !== "" &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng)),
    start = [has ? Number(lat) : 47.9189, has ? Number(lng) : 106.9176];
  window.customerMap = L.map(mapEl, {
    tap: true,
    zoomControl: true,
  }).setView(start, has ? 15 : 12);
  window.customerTileFallback = false;
  window.customerTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    },
  ).addTo(window.customerMap);
  window.customerTileLayer.on("tileerror", () => {
    if (window.customerTileFallback || !window.customerMap) return;
    window.customerTileFallback = true;
    if (window.customerTileLayer?.remove) window.customerTileLayer.remove();
    window.customerTileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      },
    ).addTo(window.customerMap);
  });
  const setPoint = (la, ln) => setCustomerMapPoint(la, ln);
  if (has) setPoint(start[0], start[1]);
  window.customerMap.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));
  if (window.L?.DomEvent) {
    L.DomEvent.disableScrollPropagation(mapEl);
    L.DomEvent.disableClickPropagation(mapEl);
  }
  if (!has) {
    setTimeout(() => showCustomerUserLocation(false, { setPin: true }), 400);
  }
  scheduleCustomerMapResize();
  bindCustomerMapLocateButton();
  bindCustomerMapSettingsButton();
}
async function applyCustomerSave(data, id) {
  const incomingImage = String(data.image || "").trim();
  if (productMediaPathFromUrl(incomingImage)) {
    data.image = productMediaPathFromUrl(incomingImage);
  }
  applyCustomerPhoneFields(
    data,
    Array.isArray(data.phones)
      ? data.phones
      : customerPhonesList({
          phones: data.phones,
          phone1: data.phone1,
          phone2: data.phone2,
        }),
  );
  let customer = null;
  if (id) {
    const existing = state.customers.find((c) => c.id === id);
    if (!existing) return;
    const prevImage = storedEntityImage(existing);
    Object.assign(existing, data);
    if (!storedEntityImage(existing) && prevImage) {
      existing.image = prevImage;
    }
    applyCustomerPhoneFields(existing, existing.phones);
    customer = existing;
  } else {
    customer = { ...data, id: String(Date.now()) };
    if (!customer.image) delete customer.image;
    applyCustomerPhoneFields(customer, customer.phones);
    state.customers.push(customer);
  }
  if (customer) {
    await persistProfileImageToMedia(customer, "customer");
  }
  const customerId = customer?.id || "";
  const customerName = customer?.name || customer?.companyName || "Харилцагч";
  closeModal();
  focusSavedCustomer(customerId, customerName);
  const saved = await criticalBackendSave();
  if (!saved) {
    showAppToast(
      `${customerName} хадгалагдлаа, серверт илгээхэд алдаа гарлаа`,
      "error",
    );
  }
}
async function saveCustomer(e, id) {
  e.preventDefault();
  if (customerSaveLock) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const setSaving = (on) => {
    customerSaveLock = on;
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.textContent = on ? "Хадгалагдаж байна..." : "Хадгалах";
  };
  if (customerImageCompressTask) {
    try {
      await customerImageCompressTask;
    } catch {
      return;
    }
  }
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  applyCustomerPhoneFields(data, customerPhonesFromFormData(fd));
  const image = readCustomerImageFromForm(e.target);
  if (image) data.image = image;
  else delete data.image;
  const regConflict = findCustomerByRegistrationNumber(
    data.registrationNumber,
    id || "",
  );
  if (regConflict) {
    const rd =
      customerRegistrationDisplay(regConflict) ||
      normalizeRegistrationNumber(data.registrationNumber);
    const name = regConflict.name || regConflict.companyName || "Харилцагч";
    return alert(
      `Энэ регистрийн дугаар (${rd}) аль хэдийн бүртгэлтэй: ${name}`,
    );
  }
  if (id) {
    const existing = state.customers.find((c) => c.id === id);
    if (!existing) return alert("Харилцагч олдсонгүй");
    const name = data.name || data.companyName || existing.name || "Харилцагч";
    confirmModal(
      "Засвар хадгалах",
      `<p><b>${esc(name)}</b> засаж дууслаа. Хадгалах уу?</p>`,
      {
        confirmLabel: "Хадгалах",
        cancelLabel: "Үгүй",
        closable: true,
        onConfirm: async () => {
          setSaving(true);
          try {
            await applyCustomerSave(data, id);
          } finally {
            setSaving(false);
          }
        },
      },
    );
    return;
  }
  setSaving(true);
  try {
    await applyCustomerSave(data, id);
  } finally {
    setSaving(false);
  }
}
function customerDetail(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return;
  box(c.name, customerDetailHtml(c), "max-w-xl");
}
function productModal(id) {
  if (
    id ? !hasPermission("products.edit") : !hasPermission("products.create")
  ) {
    return alertModal("Эрхгүй", "Бараа засах эрхгүй.");
  }
  const isNew = !id;
  const p = state.products.find((x) => x.id === id) || {
    unit: "ширхэг",
    boxQuantity: 1,
    price: 0,
    stock: 0,
    minStock: 0,
    country: "Монгол",
  };
  const packQtyVal =
    Number(p.boxQuantity) > 1 ? String(Math.floor(Number(p.boxQuantity))) : "";
  const packFieldAttrs = inputAttrs(packQtyVal, "24", {
    treatZeroAsEmpty: true,
  });
  const barcodeAttrs = inputAttrs(p.barcode || "", "Баркод");
  box(
    id ? PRODUCT_EDIT_TITLE : PRODUCT_NEW_TITLE,
    `<form onsubmit="saveProduct(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Баркод</span><div class="barcode-input-row"><input id="productBarcodeInput" name="barcode" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" ${barcodeAttrs} onchange="fillProductFromBarcode(this.value)" class="w-full px-4 py-3 bg-secondary rounded"><button type="button" onclick="startBarcodeScan('product')" class="px-4 py-3 bg-primary text-primary-foreground rounded text-sm">Scan</button></div><p id="productBarcodeLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>${field("name", "Барааны нэр", p.name)}</div><div id="barcodeScanner" class="barcode-scanner" hidden><video id="barcodeVideo" playsinline webkit-playsinline muted autoplay></video><div class="barcode-scanner-actions"><span id="barcodeStatus">Баркодоо camera-д ойртуулна уу</span><button type="button" onclick="stopBarcodeScan()" class="px-3 py-2 bg-card rounded text-sm text-foreground">Зогсоох</button></div></div><label><span class="block text-sm font-medium mb-2">Төрөл</span><select name="category" required class="w-full px-4 py-3 bg-secondary rounded app-input"><option value="" disabled ${p.category ? "" : "selected"}>Төрөл сонгох</option>${cats()
      .map(
        (c) =>
          `<option value="${esc(c)}" ${p.category === c ? "selected" : ""}>${esc(c)}</option>`,
      )
      .join(
        "",
      )}<option value="__new__">+ Шинэ төрөл</option></select></label><label><span class="block text-sm font-medium mb-2">Хэмжих нэгж</span><select name="unit" class="w-full px-4 py-3 bg-secondary rounded">${["ширхэг", "KG", "метр"].map((u) => `<option ${p.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></label><label><span class="block text-sm font-medium mb-2">Багц</span><input name="boxQuantity" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" ${packFieldAttrs} class="w-full px-4 py-3 bg-secondary rounded app-input"><p class="text-xs text-muted-foreground mt-2">1 багц = хэдэн ширхэг? (жишээ нь 24). 1 эсвэл хоосон бол зөвхөн ширхгээр тоолно.</p></label>${field("price", "Борлуулалтын үнэ", isNew ? "" : p.price, "number", "0")}${field("country", "Үйлдвэрлэсэн улс", isNew ? "" : p.country, "text", "Монгол")}<div><span class="block text-sm font-medium mb-2">Зураг</span><div class="flex items-center gap-3 bg-secondary rounded p-3"><img id="productImagePreview" src="${productImageSrcAttr(p)}" class="product-thumb product-thumb--preview" referrerpolicy="no-referrer"><div class="flex-1"><input type="file" accept="image/jpeg,image/png,image/webp,image/*" onchange="handleProductImage(this)" class="w-full text-sm"><input id="productImageValue" name="image" type="hidden" value=""><p class="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP зураг сонгоно.</p></div></div></div><p class="text-xs text-muted-foreground">Үлдэгдэл болон <b>өртөг үнэ</b> нь зөвхөн <b>Агуулах → Орлого авах</b> цэснээс оруулна.</p><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
  );
  requestAnimationFrame(() => initProductImageField(p));
}
function handleProductImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  productImageCompressTask = compressProductImageFile(file)
    .then((dataUrl) => {
      const value = document.getElementById("productImageValue"),
        preview = document.getElementById("productImagePreview");
      if (value) value.value = dataUrl;
      if (preview) preview.src = dataUrl;
    })
    .catch((error) => {
      console.warn("Product image compress failed", error);
      alert("Зураг хэт том байна. Жижиг зураг сонгоно уу.");
    })
    .finally(() => {
      productImageCompressTask = null;
    });
}
let productBarcodeLookupId = 0;
let lesRegistryIndex = null;
let lesRegistryLoadPromise = null;
let customerRegistryLookupId = 0;
let customerRegistryLookupTimer = null;

async function loadLesRegistryIndex() {
  if (lesRegistryIndex && Object.keys(lesRegistryIndex).length > 0) {
    return lesRegistryIndex;
  }
  if (!lesRegistryLoadPromise) {
    lesRegistryLoadPromise = fetch(
      "/static/tomuda/data/les-registry-index.json",
    )
      .then((res) => {
        if (!res.ok) throw new Error("registry load failed");
        return res.json();
      })
      .then((data) => {
        lesRegistryIndex = data && typeof data === "object" ? data : {};
        if (!Object.keys(lesRegistryIndex).length) {
          throw new Error("registry index empty");
        }
        return lesRegistryIndex;
      })
      .catch((err) => {
        console.warn("LES registry index load failed", err);
        lesRegistryLoadPromise = null;
        lesRegistryIndex = null;
        throw err;
      });
  }
  return lesRegistryLoadPromise;
}

function scheduleCustomerRegistryLookup(value) {
  clearTimeout(customerRegistryLookupTimer);
  customerRegistryLookupTimer = setTimeout(
    () => fillCustomerFromRegistration(value),
    350,
  );
}

async function fillCustomerFromRegistration(code) {
  const input = document.getElementById("customerRegistrationInput"),
    form = input?.closest("form"),
    status = document.getElementById("customerRegistryLookupStatus"),
    parsed = parseRegistrationNumber(code),
    reg = parsed.digits,
    lookupId = ++customerRegistryLookupId;
  if (!form) return;
  if (!reg) {
    if (status) {
      status.textContent = parsed.prefix
        ? "Регистрийн тоог үргэлжлүүлэн бичнэ үү"
        : "";
    }
    return;
  }
  const lookupMinDigits = reg.length >= 8 ? 8 : REGISTRATION_LOOKUP_MIN_DIGITS;
  if (reg.length < lookupMinDigits) {
    if (status) {
      status.textContent =
        reg.length > 0
          ? `Регистрийн тоог бүрэн бичнэ үү (${lookupMinDigits} орон)`
          : "";
    }
    return;
  }
  const excludeId = form.dataset.customerId || "";
  const existing = findCustomerByRegistrationNumber(code, excludeId);
  if (existing) {
    const name = existing.name || existing.companyName || "Харилцагч";
    if (status)
      status.textContent = `Энэ регистрийн дугаар аль хэдийн бүртгэлтэй: ${name}`;
    return;
  }
  if (status) {
    status.textContent = lesRegistryIndex
      ? "Регистрээр хайж байна..."
      : "Регистрийн жагсаалт ачаалж байна...";
  }
  try {
    const index = await loadLesRegistryIndex();
    if (lookupId !== customerRegistryLookupId) return;
    const companyName = lookupLesRegistryCompany(index, code);
    if (!companyName) {
      if (status) status.textContent = "Энэ регистрээр олдсонгүй";
      return;
    }
    const nameEl = form.elements.name,
      companyEl = form.elements.companyName;
    if (companyEl) companyEl.value = companyName;
    if (nameEl && !String(nameEl.value || "").trim())
      nameEl.value = companyName;
    if (input && parsed.prefix && parsed.digits)
      input.value = `${parsed.prefix}${parsed.digits}`;
    if (status) status.textContent = "";
  } catch (error) {
    console.warn("Registry lookup failed", error);
    if (lookupId === customerRegistryLookupId && status)
      status.textContent = "Регистрийн жагсаалт ачаалж чадсангүй";
  }
}
const cleanExternalText = (text) =>
  String(text || "")
    .replace(/^en:/, "")
    .replace(/-/g, " ")
    .trim();
function productNameFromBarcodeData(product) {
  return (
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    product.brands ||
    ""
  ).trim();
}
function productCategoryFromBarcodeData(product) {
  const tag = product.categories_tags?.[0],
    category = cleanExternalText(tag || product.categories);
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : "";
}
function productCountryFromBarcodeData(product) {
  const country = cleanExternalText(
    product.countries_tags?.[0] || product.countries,
  );
  return country ? country.charAt(0).toUpperCase() + country.slice(1) : "";
}
function productUnitFromBarcodeData(product) {
  const quantity = String(product.quantity || "").toLowerCase();
  if (/\b(kg|g|гр|кг)\b/.test(quantity)) return "KG";
  if (/\b(m|cm|метр)\b/.test(quantity)) return "метр";
  return "ширхэг";
}
async function fillProductFromBarcode(code) {
  const input = document.getElementById("productBarcodeInput"),
    form = input?.closest("form"),
    status = document.getElementById("productBarcodeLookupStatus"),
    barcode = String(code || "").trim(),
    lookupId = ++productBarcodeLookupId;
  if (!form || !barcode) return;
  if (input) input.value = barcode;
  if (status) status.textContent = "Баркодоор мэдээлэл хайж байна...";
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,generic_name,brands,categories,categories_tags,countries,countries_tags,image_url,quantity`,
      { headers: { Accept: "application/json" } },
    );
    if (lookupId !== productBarcodeLookupId) return;
    if (!res.ok) throw new Error("lookup failed");
    const data = await res.json(),
      product = data.product || {};
    if (!data.status || !Object.keys(product).length) {
      if (status) status.textContent = "Энэ баркодоор мэдээлэл олдсонгүй";
      return;
    }
    const values = {
      name: productNameFromBarcodeData(product),
      category: productCategoryFromBarcodeData(product),
      unit: productUnitFromBarcodeData(product),
      country: productCountryFromBarcodeData(product),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value && form.elements[key]) form.elements[key].value = value;
    });
    const image = product.image_url || "",
      imageValue = document.getElementById("productImageValue"),
      imagePreview = document.getElementById("productImagePreview");
    if (imageValue && image) imageValue.value = image;
    if (imagePreview && image) imagePreview.src = image;
    if (status)
      status.textContent = values.name
        ? `${values.name} мэдээлэл автоматаар орлоо`
        : "Олдсон мэдээллээр input-уудыг бөглөлөө";
  } catch (error) {
    if (status) status.textContent = "Barcode мэдээлэл татаж чадсангүй";
    return;
  }
}
function buildProductDataFromForm(form) {
  const data = Object.fromEntries(new FormData(form));
  if (!data.category?.trim()) return { error: "Төрөл сонгоно уу" };
  if (data.category === "__new__") {
    const custom = prompt("Шинэ төрлийн нэр");
    if (!custom?.trim()) return { error: "Төрөл сонгоно уу" };
    data.category = custom.trim();
    if (!state.extraCategories.includes(data.category))
      state.extraCategories.push(data.category);
  }
  data.price = Number(data.price || 0);
  delete data.costPrice;
  const packRaw = String(data.boxQuantity ?? "").trim();
  if (!packRaw) {
    data.boxQuantity = 1;
  } else {
    const pack = Math.floor(Number(packRaw));
    if (!Number.isFinite(pack) || pack < 1) {
      return { error: "Багцад зөв ширхэгийн тоо оруулна уу" };
    }
    data.boxQuantity = pack;
  }
  data.country = String(data.country || "").trim() || "Монгол";
  const image = readProductImageFromForm(form);
  if (image) data.image = image;
  else delete data.image;
  return { data };
}
async function persistProductImageToMedia(product) {
  const productId = String(product?.id || "").trim();
  const image = String(product?.image || "").trim();
  if (!productId || !image) return "";
  if (image.startsWith("data:image/")) {
    try {
      const url = await uploadProductImage(productId, image);
      if (url) {
        product.image = url;
      }
      return url || "";
    } catch (error) {
      console.warn("Product image upload failed", error);
      return "";
    }
    return "";
  }
  if (
    (image.startsWith("http://") || image.startsWith("https://")) &&
    !productMediaPathFromUrl(image)
  ) {
    try {
      const url = await mirrorProductImage(productId, image);
      if (url) {
        product.image = url;
      }
      return url || "";
    } catch (error) {
      console.warn("Product image mirror failed", error);
      try {
        product.image = await fetchImageAsDataUrl(image);
        return product.image;
      } catch (fallbackError) {
        console.warn("Product image browser fetch failed", fallbackError);
        return "";
      }
    }
  }
  return image;
}
async function applyProductSave(data, id) {
  const incomingImage = String(data.image || "").trim();
  if (productMediaPathFromUrl(incomingImage)) {
    data.image = productMediaPathFromUrl(incomingImage);
  }
  let productId = id;
  if (id) {
    const existing = state.products.find((p) => p.id === id);
    if (!existing) return alert("Бараа олдсонгүй");
    const prevImage = storedProductImage(existing);
    Object.assign(existing, data);
    if (!storedProductImage(existing) && prevImage) {
      existing.image = prevImage;
    }
  } else {
    productId = String(Date.now());
    state.products.push({
      ...data,
      id: productId,
      stock: 0,
      minStock: 0,
      costPrice: 0,
    });
  }
  const product = state.products.find((p) => p.id === productId);
  if (product) {
    await persistProductImageToMedia(product);
  }
  closeModal();
  render();
  showAppToast(
    id
      ? `${product?.name || "Бараа"} хадгалагдлаа`
      : `${product?.name || "Бараа"} нэмэгдлээ`,
    "success",
  );
  await flushBackendSave().catch((error) =>
    console.warn("Product backend save failed", error),
  );
}
async function saveProduct(e, id) {
  if (
    id ? !hasPermission("products.edit") : !hasPermission("products.create")
  ) {
    return alertModal("Эрхгүй", "Бараа хадгалах эрхгүй.");
  }
  e.preventDefault();
  if (productImageCompressTask) {
    try {
      await productImageCompressTask;
    } catch {
      return;
    }
  }
  const built = buildProductDataFromForm(e.target);
  if (built.error) return alert(built.error);
  if (id) {
    const existing = state.products.find((p) => p.id === id);
    if (!existing) return alert("Бараа олдсонгүй");
    const name = built.data.name || existing.name || "Бараа";
    confirmModal(
      "Засвар хадгалах",
      `<p><b>${esc(name)}</b> засаж дууслаа. Хадгалах уу?</p>`,
      {
        confirmLabel: "Хадгалах",
        cancelLabel: "Үгүй",
        closable: true,
        onConfirm: () => {
          void applyProductSave(built.data, id);
        },
      },
    );
    return;
  }
  await applyProductSave(built.data, id);
}
function categoryProductCount(name) {
  return state.products.filter((p) => p.category === name).length;
}
function categoryModal() {
  if (!canManageProductCategories()) {
    return alertModal("Эрхгүй", "Төрөл удирдах эрхгүй.");
  }
  const rows = cats()
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "mn"))
    .map((cat) => {
      const count = categoryProductCount(cat);
      const meta =
        count > 0
          ? `<span class="category-row__meta">${count} бараа</span>`
          : `<span class="category-row__meta category-row__meta--empty">Хоосон</span>`;
      return `<div class="category-row"><span class="category-row__name">${esc(cat)}</span><div class="category-row__actions">${meta}${deleteIconButton(
        {
          className: "category-row__delete",
          attrs: `onclick="confirmDeleteCategory('${esc(cat)}')"`,
          label: "Төрөл устгах",
        },
      )}</div></div>`;
    })
    .join("");
  box(
    "Төрөл удирдах",
    `<form onsubmit="addCategory(event)" class="category-form p-5 flex flex-col min-h-0 max-h-[85vh]"><div class="category-form__add shrink-0"><label class="block text-sm font-medium mb-2">Шинэ төрөл</label><div class="category-form__add-row"><input name="category" autofocus required placeholder="Төрөлийн нэр" class="flex-1 px-4 py-3 bg-secondary rounded app-input"><button type="submit" class="btn btn--primary shrink-0">Нэмэх</button></div></div><div class="category-form__list modal-scroll flex-1 min-h-0 overflow-y-auto mt-4">${rows || `<p class="category-form__empty">Төрөл байхгүй</p>`}</div></form>`,
    "max-w-lg",
  );
}
function applyAddCategory(name) {
  if (!canManageProductCategories()) return;
  const trimmed = String(name || "").trim();
  if (!trimmed) return;
  if (!state.extraCategories.includes(trimmed)) {
    state.extraCategories.push(trimmed);
  }
  criticalBackendSave();
  showAppToast(`«${trimmed}» төрөл нэмэгдлээ`, "success");
  categoryModal();
}
function addCategory(e) {
  e.preventDefault();
  if (!canManageProductCategories()) {
    return alertModal("Эрхгүй", "Төрөл нэмэх эрхгүй.");
  }
  const name = String(new FormData(e.target).get("category") || "").trim();
  if (!name) return alert("Төрөлийн нэр оруулна уу");
  if (cats().includes(name)) {
    return alertModal(
      "Давхардал",
      `<strong>${esc(name)}</strong> нэртэй төрөл аль хэдийн байна.`,
    );
  }
  confirmModal(
    "Төрөл нэмэх үү?",
    `<strong>${esc(name)}</strong> нэртэй шинэ төрөл нэмэх гэж байна.`,
    {
      confirmLabel: "Нэмэх",
      onConfirm: () => applyAddCategory(name),
    },
  );
}
function confirmDeleteCategory(name) {
  if (!canManageProductCategories()) {
    return alertModal("Эрхгүй", "Төрөл устгах эрхгүй.");
  }
  if (name === "Бусад") {
    return alertModal(
      "Устгах боломжгүй",
      "«Бусад» үндсэн төрөл тул устгах боломжгүй.",
    );
  }
  const count = categoryProductCount(name);
  if (count > 0) {
    confirmModal(
      "Төрөл устгах уу?",
      `<p><strong>${esc(name)}</strong> төрөлд <strong>${count}</strong> бараа байна.</p><p class="text-sm text-muted-foreground mt-2">Устгахад эдгээр барааг «Бусад» төрөл рүү шилжүүлнэ.</p>`,
      {
        confirmLabel: "Устгах",
        danger: true,
        onConfirm: () => deleteCategoryNow(name),
      },
    );
    return;
  }
  confirmModal(
    "Төрөл устгах үү?",
    `<strong>${esc(name)}</strong> төрлийг устгах гэж байна.`,
    {
      confirmLabel: "Устгах",
      danger: true,
      onConfirm: () => deleteCategoryNow(name),
    },
  );
}
function deleteCategoryNow(name) {
  if (!canManageProductCategories()) return;
  if (name === "Бусад") return;
  state.products.forEach((p) => {
    if (p.category === name) p.category = "Бусад";
  });
  state.extraCategories = state.extraCategories.filter((c) => c !== name);
  if (state.filters.category === name) state.filters.category = "all";
  if (state.filters.inventoryCategory === name)
    state.filters.inventoryCategory = "all";
  if (state.filters.countCategory === name) state.filters.countCategory = "all";
  if (state.filters.workerCategory === name) state.filters.workerCategory = "";
  criticalBackendSave();
  showAppToast(`«${name}» төрөл устгагдлаа`, "success");
  categoryModal();
}
function employeeModal(id) {
  const editId = id ? String(id) : "";
  if (editId) {
    if (!hasPermission("employees.edit")) {
      return alertModal("Эрхгүй", "Ажилтан засах эрхгүй.");
    }
  } else if (!hasPermission("employees.create")) {
    return alertModal("Эрхгүй", "Ажилтан нэмэх эрхгүй.");
  }
  const e = editId ? state.employees.find((x) => x.id === editId) : null;
  if (editId && !e) return alert("Ажилтан олдсонгүй");
  const isEdit = !!editId;
  const selectedRole = e?.role || "sales";
  const roleOptions = ["sales", "warehouse", "delivery", "admin"]
    .map(
      (r) =>
        `<option value="${r}" ${selectedRole === r ? "selected" : ""}>${role(r)}</option>`,
    )
    .join("");
  const passwordAttrs = isEdit
    ? `placeholder="Шинэ нууц үг (хоосон = өөрчлөхгүй)" autocomplete="new-password"`
    : `required placeholder="Нууц үг" autocomplete="new-password"`;
  box(
    isEdit ? "Ажилтан засах" : "Ажилтан нэмэх",
    `<form data-employee-form data-employee-id="${esc(editId)}" class="employee-form p-5 flex flex-col min-h-0 max-h-[90vh]"><div class="employee-form__body modal-scroll overflow-y-auto space-y-3 flex-1 min-h-0">${employeeImageField(e || {})}<input name="name" required placeholder="Нэр" value="${esc(e?.name || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="email" type="email" required placeholder="Email" value="${esc(e?.email || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Утас" value="${esc(e?.phone || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><div class="login-password-wrap"><input id="employeePassword" name="password" type="password" ${passwordAttrs} class="w-full px-3 py-3 bg-secondary rounded app-input"><button type="button" id="employeePasswordToggle" onclick="togglePasswordField('employeePassword','employeePasswordToggle')" class="login-password-toggle" aria-label="Нууц үг харах">Харах</button></div><select name="role" id="employeeRoleSelect" class="w-full px-3 py-3 bg-secondary rounded app-input">${roleOptions}</select><p class="text-xs text-muted-foreground">Эрх болон «Хувь тооцох» зөвшөөрлийг Админ → Эрхийн тохиргоо хэсэгт тохируулна.</p></div><div class="employee-form__foot shrink-0 pt-3 mt-2 border-t border-border"><button type="submit" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">${isEdit ? "Хадгалах" : "Нэмэх"}</button></div></form>`,
    "max-w-lg",
  );
  setTimeout(() => initEmployeeImageField(e || {}), 0);
}
function buildEmployeeDataFromForm(form, editId = "") {
  const f = Object.fromEntries(new FormData(form));
  const name = String(f.name || "").trim();
  const email = normalizeEmail(f.email);
  const password = String(f.password || "");
  if (!name) return { error: "Нэр оруулна уу" };
  if (!email) return { error: "Email оруулна уу" };
  if (!editId && !password) return { error: "Нууц үг оруулна уу" };
  if (
    state.employees.some(
      (emp) => normalizeEmail(emp.email) === email && emp.id !== editId,
    )
  ) {
    return { error: "Энэ email аль хэдийн бүртгэгдсэн байна" };
  }
  const roleValue = f.role || "sales";
  const existing = editId
    ? state.employees.find((emp) => emp.id === editId)
    : null;
  const permissions = permApi()
    ? existing?.permissions?.length && existing.role === roleValue
      ? permApi().normalizeKeys(existing.permissions)
      : permApi().templateForRole(roleValue)
    : permApi()?.templateForRole(roleValue) || [];
  if (!permissions.length) {
    return { error: "Дор хаяж нэг эрх сонгоно уу" };
  }
  return {
    data: {
      name,
      email,
      phone: String(f.phone || "").trim(),
      password,
      role: roleValue,
      ...(readEmployeeImageFromForm(form)
        ? { image: readEmployeeImageFromForm(form) }
        : {}),
      allowPercentDiscount:
        roleValue === "sales"
          ? existing?.role === "sales"
            ? existing.allowPercentDiscount !== false
            : true
          : false,
      permissions,
    },
  };
}
async function applyEmployeeSave(data, editId = "") {
  const incomingImage = String(data.image || "").trim();
  if (productMediaPathFromUrl(incomingImage)) {
    data.image = productMediaPathFromUrl(incomingImage);
  }
  let employee = null;
  if (editId) {
    const existing = state.employees.find((e) => e.id === editId);
    if (!existing) return alert("Ажилтан олдсонгүй");
    const prevImage = storedEntityImage(existing);
    existing.name = data.name;
    existing.email = data.email;
    existing.phone = data.phone;
    existing.role = data.role;
    if (data.image) existing.image = data.image;
    else if (!storedEntityImage(existing) && prevImage)
      existing.image = prevImage;
    else if (!incomingImage) delete existing.image;
    existing.allowPercentDiscount = data.allowPercentDiscount;
    existing.permissions = data.permissions;
    if (data.password) existing.password = data.password;
    employee = existing;
    if (state.currentEmployee?.id === editId) {
      state.currentEmployee = existing;
      applyLoginRoleDefaults(existing);
      saveAuthSession();
    }
    showInstallToast("Ажилтан шинэчлэгдлээ");
  } else {
    employee = {
      id: "employee-" + Date.now(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role,
      image: data.image || "",
      totalSales: 0,
      commissionRate: 0,
      allowPercentDiscount: data.allowPercentDiscount,
      permissions: data.permissions,
    };
    if (!employee.image) delete employee.image;
    state.employees.push(employee);
    showInstallToast("Ажилтан нэмэгдлээ");
  }
  if (employee) {
    await persistProfileImageToMedia(employee, "employee");
  }
  closeModal();
  render();
  await criticalBackendSave();
}
function orderModal() {
  box(
    "Шинэ захиалга",
    `<form onsubmit="saveOrder(event)" class="p-5 space-y-4 modal-scroll overflow-y-auto"><select name="customerId" class="w-full px-3 py-3 bg-secondary rounded">${sortCustomersByName(
      state.customers,
    )
      .map((c) => `<option value="${c.id}">${c.companyName}</option>`)
      .join(
        "",
      )}</select><div class="grid md:grid-cols-2 gap-3">${state.products.map((p) => `<label class="rounded bg-secondary/50 p-3 grid grid-cols-[1fr_80px] gap-2"><span><b>${p.name}</b><small class="block text-muted-foreground">${fmt(p.price)} · Үлд ${p.stock}</small></span><input name="${p.id}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="0" placeholder="0" class="px-2 py-2 bg-card rounded text-center"></label>`).join("")}</div><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-5xl",
  );
}
function saveOrder(e) {
  e.preventDefault();
  if (orderSubmitLock) return;
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const f = new FormData(e.target),
    c = state.customers.find((x) => x.id === f.get("customerId"));
  if (!c) return alert("Харилцагч сонгоно уу");
  const emp = orderActor();
  if (!emp?.id) return alert("Худалдааны төлөөлөгч сонгоно уу");
  const items = state.products
    .map((p) => {
      const q = Math.floor(Number(f.get(p.id) || 0));
      if (!Number.isFinite(q) || q < 1) return null;
      return {
        productId: p.id,
        productName: p.name,
        quantity: q,
        price: p.price,
        total: p.price * q,
      };
    })
    .filter(Boolean);
  if (!items.length) return alert("Бараа сонгоно уу");
  if (alertOrderStockIssues(orderStockIssues(items))) return;
  orderSubmitLock = true;
  state.orders.push(
    buildNewOrder({
      customerId: c.id,
      customerName: c.name,
      items,
      total: items.reduce((s, i) => s + i.total, 0),
      status: "pending",
      employeeId: emp.id,
      employeeName: emp.name,
      employeePhone: emp.phone || "",
      ...orderEmailFields(emp),
      paymentTerm: "credit",
      isPaid: false,
      ...deliveryFieldsForNewOrder(),
    }),
  );
  applyOrderStock(items);
  persistOrderSnapshot();
  closeModal();
  render();
  orderSubmitLock = false;
  flushBackendSave()
    .then((ok) => {
      if (!ok) {
        showAppToast(
          "Захиалга хадгалагдлаа, серверт илгээхэд алдаа гарлаа",
          "error",
        );
      }
    })
    .catch((error) => {
      console.warn("Order backend save failed", error);
      showAppToast(
        "Захиалга хадгалагдлаа, серверт илгээхэд алдаа гарлаа",
        "error",
      );
    });
}
function clearReceiptEdit() {
  state.receiptEditOrderId = "";
  state.receiptEditItems = null;
  state.receiptEditOriginalItems = null;
  receiptEditQtyConfirmOpen = false;
  receiptEditQtyTimers.clear();
}
function receiptEditHasChanges() {
  const orig = state.receiptEditOriginalItems;
  const cur = state.receiptEditItems;
  if (!orig || !cur) return false;
  if (orig.length !== cur.length) return true;
  return cur.some((item, i) => {
    const o = orig[i];
    return (
      item.productId !== o.productId ||
      item.quantity !== o.quantity ||
      item.total !== o.total
    );
  });
}
function receiptEditDraftOrder() {
  const o = state.orders.find((x) => x.id === state.receiptEditOrderId);
  if (!o || !state.receiptEditItems) return o;
  const draft = { ...o, items: state.receiptEditItems };
  return recalcOrderTotals(draft);
}
function orderReceiptEditRows() {
  return (state.receiptEditItems || [])
    .map((i, idx) => {
      if (i.isPromoFree) {
        return `<tr class="receipt-edit-row receipt-edit-row--promo"><td class="receipt-edit-row__name">${esc(i.productName)}</td><td class="receipt-edit-row__qty">${i.quantity}</td><td class="receipt-edit-row__sum">0</td></tr>`;
      }
      return `<tr class="receipt-edit-row"><td class="receipt-edit-row__name">${esc(i.productName)}</td><td class="receipt-edit-row__qty"><input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="receipt-edit-qty app-input" data-receipt-qty="${idx}" value="${i.quantity}" onfocus="receiptEditQtyFocus(this)" oninput="receiptEditQtyDraft(this)" onkeydown="receiptEditQtyKeydown(event, this)" onblur="receiptEditQtyCommit(this)" aria-label="${esc(i.productName)} тоо"></td><td class="receipt-edit-row__sum" data-receipt-line-total="${idx}">${fmt(resolveOrderItemLineTotal(i))}</td></tr>`;
    })
    .join("");
}
function refreshReceiptEditTotals() {
  const draft = receiptEditDraftOrder();
  if (!draft) return;
  (state.receiptEditItems || []).forEach((item, idx) => {
    const el = document.querySelector(`[data-receipt-line-total="${idx}"]`);
    if (el)
      el.textContent = item.isPromoFree
        ? "0"
        : fmt(resolveOrderItemLineTotal(item));
  });
  const totalEl = document.getElementById("receipt-edit-total");
  if (totalEl) totalEl.textContent = fmt(orderPayableTotal(draft));
}
let receiptEditQtyConfirmOpen = false;
const receiptEditQtyTimers = new Map();
function receiptEditQtyFocus(el) {
  const idx = el.getAttribute("data-receipt-qty");
  if (idx != null) receiptEditQtyTimers.delete(String(idx));
}
function receiptEditQtyKeydown(e, el) {
  if (e.key === "Enter") {
    e.preventDefault();
    const idx = el.getAttribute("data-receipt-qty");
    if (idx != null) receiptEditQtyTimers.delete(String(idx));
    receiptEditQtyCommit(el);
  }
}
function receiptEditQtyDraft(el) {
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  const idx = el.getAttribute("data-receipt-qty");
  if (idx == null) return;
  const key = String(idx);
  clearTimeout(receiptEditQtyTimers.get(key));
  receiptEditQtyTimers.set(
    key,
    setTimeout(() => {
      receiptEditQtyTimers.delete(key);
      receiptEditQtyCommit(el);
    }, 400),
  );
}
function receiptEditQtyCommit(el) {
  if (receiptEditQtyConfirmOpen) return;
  const idx = Number(el.getAttribute("data-receipt-qty"));
  const item = state.receiptEditItems?.[idx];
  if (!item || item.isPromoFree) return;
  const oldQ = item.quantity;
  const q = Math.max(
    0,
    Math.floor(Number(String(el.value || "").replace(/\D/g, "")) || 0),
  );
  if (q === oldQ) return;
  const name = esc(item.productName);
  const unitPrice = resolveOrderItemUnitPrice(item);
  const oldTotal = oldQ * unitPrice;
  const newTotal = q * unitPrice;
  receiptEditQtyConfirmOpen = true;
  confirmModal(
    "Тоо өөрчлөх",
    `<p><b>${name}</b></p><p class="text-sm text-muted-foreground mt-2">Тоо: <b>${oldQ}</b> → <b>${q}</b> ш</p><p class="text-sm text-muted-foreground">Мөрний дүн: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => {
        receiptEditQtyConfirmOpen = false;
        item.quantity = q;
        item.price = unitPrice;
        item.total = newTotal;
        el.value = String(q);
        refreshReceiptEditTotals();
      },
      onCancel: () => {
        receiptEditQtyConfirmOpen = false;
        el.value = String(oldQ);
      },
    },
  );
}
function adjustReceiptEditStock(beforeItems, afterItems) {
  const qtyByProduct = (items) => {
    const map = {};
    (items || []).forEach((i) => {
      if (!i?.productId) return;
      map[i.productId] = (map[i.productId] || 0) + (Number(i.quantity) || 0);
    });
    return map;
  };
  const before = qtyByProduct(beforeItems);
  const after = qtyByProduct(afterItems);
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  ids.forEach((id) => {
    const delta = (after[id] || 0) - (before[id] || 0);
    if (delta > 0) stock(id, delta, "out");
    else if (delta < 0) stock(id, -delta, "in");
  });
}
function applyReceiptEditToOrder() {
  const o = state.orders.find((x) => x.id === state.receiptEditOrderId);
  if (!o || !state.receiptEditItems) return false;
  const orig = state.receiptEditOriginalItems || o.items;
  adjustReceiptEditStock(orig, state.receiptEditItems);
  o.items = state.receiptEditItems.map((i) => ({ ...i }));
  recalcOrderTotals(o);
  criticalBackendSave();
  return true;
}
function orderReceiptModal(id, keepDraft = false) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  state.receiptEditOrderId = id;
  if (!keepDraft || !state.receiptEditItems) {
    const items = orderItemsWithPromos(o);
    state.receiptEditOriginalItems = items.map((i) => ({ ...i }));
    state.receiptEditItems = items.map((i) => ({ ...i }));
  }
  const draft = receiptEditDraftOrder();
  box(
    `<span class="receipt-edit-head"><span>Зарлагын баримт</span>${receiptNo(o, "sm")}</span>`,
    `<div class="receipt-edit-modal"><div class="receipt-edit-store"><p class="receipt-edit-store__name">${esc(o.customerName)}</p><p class="receipt-edit-store__meta">${esc(o.employeeName || "-")} · Захиалга ${dteAt(o.createdAt)}</p><span class="receipt-edit-store__pill ${badge(o.status)}">${status(o.status)}</span></div><table class="receipt-edit-table"><tbody>${orderReceiptEditRows()}</tbody></table><div class="receipt-edit-total"><span>Нийт</span><strong id="receipt-edit-total">${fmt(orderPayableTotal(draft))}</strong></div></div>`,
    "max-w-lg",
    { titleId: "receipt-edit-title", dialog: true, titleHtml: true },
  );
}
function orderReceiptModalKeepDraft(id) {
  orderReceiptModal(id, true);
}
function receiptEditConfirmModal(id) {
  const o = state.orders.find((x) => x.id === id);
  const draft = receiptEditDraftOrder();
  const oldTotal = o ? orderPayableTotal(o) : 0;
  const newTotal = draft ? orderPayableTotal(draft) : oldTotal;
  confirmModal(
    "Батлах",
    `<p>Захиалгын дүнг хадгалж баримт хэвлэх үү?</p><p class="text-sm text-muted-foreground mt-2">Нийт: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => printOrderReceiptNow(id),
      onCancel: () => orderReceiptModalKeepDraft(id),
    },
  );
}
function printRootEl() {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}
async function downloadOrderReceiptExcelNow(id) {
  const hadChanges =
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges();
  if (hadChanges) {
    applyReceiptEditToOrder();
    clearReceiptEdit();
    render();
  }
  const o = state.orders.find((x) => x.id === id);
  if (!o) return alert("Захиалга олдсонгүй");
  const exportOrder =
    !hadChanges && state.receiptEditOrderId === id && state.receiptEditItems
      ? receiptEditDraftOrder()
      : o;
  await exportOrderReceiptsExcel([orderReceiptSnapshot(exportOrder || o)]);
}
function downloadOrderReceiptExcel(id, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges()
  ) {
    const draft = receiptEditDraftOrder();
    const o = state.orders.find((x) => x.id === id);
    const oldTotal = o ? orderPayableTotal(o) : 0;
    const newTotal = draft ? orderPayableTotal(draft) : oldTotal;
    confirmModal(
      "Мэдээлэл татах",
      `<p>Захиалгын дүнг хадгалж мэдээлэл татах уу?</p><p class="text-sm text-muted-foreground mt-2">Нийт: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
      {
        confirmLabel: "Татах",
        onConfirm: () => downloadOrderReceiptExcelNow(id),
        onCancel: () => orderReceiptModalKeepDraft(id),
      },
    );
    return;
  }
  downloadOrderReceiptExcelNow(id);
}
function printOrderReceipt(id, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges()
  ) {
    receiptEditConfirmModal(id);
    return;
  }
  printOrderReceiptNow(id);
}
function printOrderReceiptNow(id) {
  if (state.receiptEditOrderId === id && state.receiptEditItems) {
    applyReceiptEditToOrder();
    clearReceiptEdit();
    render();
  }
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  printOrderReceiptsNow([id]);
}
function printOrderReceiptsNow(ids) {
  const idOrder = idList(ids);
  const orders = idOrder
    .map((id) => state.orders.find((o) => o.id === id))
    .filter(Boolean);
  if (!orders.length) return alert("Захиалга олдсонгүй");
  closeModal();
  void (async () => {
    const logoSrc =
      (await getReceiptExcelLogoDataUri().catch(() => "")) ||
      RECEIPT_LOGO_DATA_URI;
    const root = printRootEl();
    root.innerHTML = `<style>${RECEIPT_EXCEL_STYLES}
@media print {
  @page { size: A4 portrait; margin: 8mm; }
  .receipt-page { width: 100%; max-width: none; padding: 0; font-size: 9pt; }
  .receipt-logo { width: 18mm; height: 18mm; }
  .receipt-grid__brand { font-size: 11pt; }
  .receipt-title { font-size: 14pt; }
}
</style>${orders.map((o) => `<div class="print-receipt">${receiptPrintPageHtml(orderReceiptSnapshot(o), logoSrc)}</div>`).join("")}`;
    const cleanup = () => {
      root.innerHTML = "";
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1500);
    }, 120);
  })();
}
function printSelectedOrderReceipts() {
  const ids = idList(state.receiptPrintOrderIds);
  if (!receiptPrintWorkerIds().length)
    return alert("Худалдааны төлөөлөгч сонгоно уу");
  if (!ids.length) return alert("Хэвлэх захиалга сонгоно уу");
  confirmPrintExport("Баримт хэвлэх", () => {
    void printOrderReceiptsNow(ids);
  });
}
function orderDetail(id) {
  orderReceiptModal(id);
}
function receiptDetail(id) {
  orderReceiptModal(id);
}
function receipt(o) {
  return `<div class="print-receipt">${receiptPrintPageHtml(orderReceiptSnapshot(o), RECEIPT_LOGO_DATA_URI)}</div>`;
}
function stock(id, qty, type) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const current = Number(p.stock) || 0;
  const q = Number(qty) || 0;
  p.stock = type === "in" ? current + q : Math.max(0, current - q);
}
function orderStockIssues(items) {
  const need = {};
  (items || []).forEach((item) => {
    const id = String(item.productId || "");
    if (!id) return;
    need[id] = (need[id] || 0) + (Number(item.quantity) || 0);
  });
  const issues = [];
  Object.entries(need).forEach(([id, qty]) => {
    const p = state.products.find((x) => x.id === id);
    const have = Number(p?.stock) || 0;
    if (!p || qty > have) {
      issues.push({
        id,
        name: p?.name || itemNameFromOrderItems(items, id) || "Бараа",
        need: qty,
        have,
      });
    }
  });
  return issues;
}
function itemNameFromOrderItems(items, productId) {
  const line = (items || []).find(
    (i) => String(i.productId) === String(productId),
  );
  return line?.productName || "";
}
function alertOrderStockIssues(issues) {
  if (!issues.length) return false;
  const detail = issues
    .map((i) => `${i.name}: ${i.have} үлдсэн, ${i.need} ш хэрэгтэй`)
    .join("\n");
  alert(`Үлдэгдэл хүрэлцэхгүй байна.\n${detail}`);
  return true;
}
function applyOrderStock(items) {
  (items || []).forEach((i) => stock(i.productId, i.quantity, "out"));
}
function applyStock(id, type, qty, costPrice) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return false;
  const q =
    qty != null
      ? Number(qty)
      : Number(document.getElementById(`qty-${id}`)?.value || 0);
  if (!Number.isFinite(q) || q < 1) {
    alert("Тоо оруулна уу");
    return false;
  }
  const stockNow = Number(p.stock) || 0;
  if (type === "out" && q > stockNow) {
    alert("Үлдэгдэл хүрэлцэхгүй байна!");
    return false;
  }
  if (
    type === "in" &&
    costPrice != null &&
    Number.isFinite(Number(costPrice))
  ) {
    p.costPrice = Number(costPrice);
  }
  stock(id, q, type);
  state.inventoryLogs.push({
    id: nextInventoryLogId(),
    productId: id,
    productName: p.name,
    type,
    quantity: q,
    date: new Date().toISOString(),
    employeeName:
      type === "out"
        ? stockOutEmployeeName()
        : state.currentEmployee?.name || "",
  });
  render();
  showAppToast(
    type === "in"
      ? `${p.name} · +${q} ш орлого`
      : `${p.name} · −${q} ш зарлага`,
    "success",
  );
  criticalBackendSave();
  return true;
}
function pickerProductsInView() {
  const cat = state.filters.workerCategory || "";
  return state.products
    .filter((p) => !cat || p.category === cat)
    .sort((a, b) => {
      const byCat = (a.category || "").localeCompare(b.category || "", "mn");
      if (byCat) return byCat;
      return (a.name || "").localeCompare(b.name || "", "mn");
    });
}
function pickerCategoryChipsHtml() {
  const active = state.filters.workerCategory || "",
    categories = cats();
  return `<div class="picker-cat-chips" role="tablist" aria-label="Төрөлөөр шүүх"><button type="button" data-picker-cat="" class="picker-cat-chip${active ? "" : " is-active"}" role="tab" aria-selected="${active ? "false" : "true"}">Бүгд</button>${categories.map((c) => `<button type="button" data-picker-cat="${esc(c)}" class="picker-cat-chip${active === c ? " is-active" : ""}" role="tab" aria-selected="${active === c ? "true" : "false"}">${esc(c)}</button>`).join("")}</div>`;
}
function updatePickerClearBtn() {
  const clearBtn = modal.querySelector("[data-picker-clear-cart]");
  if (!clearBtn) return;
  const hasSelected = state.products.some(
    (p) => (state.workerQty[p.id] || 0) > 0,
  );
  clearBtn.classList.toggle("is-disabled", !hasSelected);
  clearBtn.disabled = !hasSelected;
}
function refreshPickerList() {
  const list = modal.querySelector("[data-picker-products]");
  if (!list || !pickerOpen()) return false;
  ensurePickerActiveId();
  updatePickerModalTitle();
  const chips = modal.querySelector(".picker-cat-chips");
  if (chips) chips.outerHTML = pickerCategoryChipsHtml();
  const products = pickerProductsInView();
  list.innerHTML = products.length
    ? products.map((p) => pickerRow(p)).join("")
    : `<div class="picker-panel__empty">Бараа олдсонгүй</div>`;
  updatePickerClearBtn();
  return true;
}
function getWorkerQty(productId) {
  const raw = state.workerQty[productId];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const p = state.products.find((x) => x.id === productId);
  if (!p) return 0;
  return Math.min(Math.floor(n), p.stock);
}
function resetWorkerCart() {
  state.workerQty = {};
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  state.workerOrderActiveId = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  state.searches.workerProduct = "";
  state.filters.workerCategory = "";
}
function setWorkerQty(id, qty) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const q = Math.max(0, Math.min(Number(qty) || 0, p.stock));
  if (q > 0) state.workerQty[id] = Math.floor(q);
  else {
    delete state.workerQty[id];
    if (state.workerOrderActiveId === id) state.workerOrderActiveId = "";
  }
  const keepPicker = pickerOpen();
  scheduleBackendSave();
  if (keepPicker) {
    if (state.pickerQtyProductId) {
      pickerModal();
      return;
    }
    if (refreshPickerList()) return;
  }
  render();
  if (keepPicker) pickerModal();
}
function applyPickerBarcode(value, scanned = false) {
  const code = String(value || "").trim();
  if (!code) return;
  state.filters.workerCategory = "";
  const product = state.products.find(
    (p) => String(p.barcode || "").trim() === code,
  );
  if (product) {
    const current = getWorkerQty(product.id);
    if (current < (Number(product.stock) || 0)) {
      setWorkerQty(product.id, current + 1);
      state.pickerActiveId = product.id;
      return;
    }
    showStockLimitToast();
  } else if (scanned) {
    showAppToast("Баркод олдсонгүй", "error");
  }
  if (scanned) stopBarcodeScan();
}
function clearPickerFilter() {
  state.searches.workerProduct = "";
  state.filters.workerCategory = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  pickerModal();
}
function handleScannedBarcode(code) {
  const value = String(code || "").trim();
  if (!value || !barcodeScanning) return;
  if (barcodeScanTarget === "product") {
    barcodeScanning = false;
    const input = document.getElementById("productBarcodeInput");
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    fillProductFromBarcode(value);
    stopBarcodeScan();
    return;
  }
  if (barcodeScanTarget === "stockIn") {
    applyStockInBarcode(value);
    return;
  }
  barcodeScanning = false;
  applyPickerBarcode(value, true);
}
function loadZxingBrowser() {
  if (window.ZXingBrowser?.BrowserMultiFormatReader)
    return Promise.resolve(window.ZXingBrowser);
  if (window.zxingBrowserLoading) {
    return new Promise((resolve, reject) => {
      const wait = setInterval(() => {
        if (window.ZXingBrowser?.BrowserMultiFormatReader) {
          clearInterval(wait);
          resolve(window.ZXingBrowser);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(wait);
        reject(new Error("ZXing load timeout"));
      }, 15000);
    });
  }
  window.zxingBrowserLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js";
    script.onload = () => {
      window.zxingBrowserLoading = false;
      if (window.ZXingBrowser?.BrowserMultiFormatReader)
        resolve(window.ZXingBrowser);
      else reject(new Error("ZXing unavailable"));
    };
    script.onerror = () => {
      window.zxingBrowserLoading = false;
      reject(new Error("ZXing load failed"));
    };
    document.head.appendChild(script);
  });
}
async function startNativeBarcodeScan(video, status) {
  barcodeStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = barcodeStream;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  await video.play();
  barcodeScanning = true;
  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
  });
  const scan = async () => {
    if (!barcodeScanning) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length) {
        handleScannedBarcode(codes[0].rawValue);
        return;
      }
      status.textContent = "Баркодоо camera-д ойртуулна уу";
    } catch (e) {
      status.textContent = "Scan уншиж чадсангүй";
    }
    barcodeScanFrame = requestAnimationFrame(scan);
  };
  scan();
}
async function startZxingBarcodeScan(video, status) {
  const { BrowserMultiFormatReader } = await loadZxingBrowser();
  zxingReader = new BrowserMultiFormatReader();
  barcodeScanning = true;
  status.textContent = "Баркодоо camera-д ойртуулна уу";
  zxingControls = await zxingReader.decodeFromVideoDevice(
    undefined,
    video,
    (result) => {
      if (result) handleScannedBarcode(result.getText());
    },
  );
}
async function startBarcodeScan(target = "picker") {
  if (!navigator.mediaDevices?.getUserMedia)
    return alert("Энэ browser camera scan дэмжихгүй байна.");
  stopBarcodeScan();
  barcodeScanTarget = target;
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  const status = document.getElementById("barcodeStatus");
  if (!panel || !video) return;
  panel.hidden = false;
  status.textContent = "Camera нээгдэж байна...";
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  try {
    if ("BarcodeDetector" in window)
      await startNativeBarcodeScan(video, status);
    else await startZxingBarcodeScan(video, status);
  } catch (e) {
    console.warn("Barcode scan failed", e);
    stopBarcodeScan();
    alert(
      "Camera нээгдсэнгүй. Browser-д camera зөвшөөрөл өгөөд дахин оролдоно уу.",
    );
  }
}
function stopBarcodeScan() {
  barcodeScanning = false;
  if (barcodeScanFrame) cancelAnimationFrame(barcodeScanFrame);
  barcodeScanFrame = 0;
  if (zxingControls?.stop) {
    try {
      zxingControls.stop();
    } catch (e) {}
    zxingControls = null;
  }
  if (zxingReader?.reset) {
    try {
      zxingReader.reset();
    } catch (e) {}
    zxingReader = null;
  }
  if (barcodeStream) {
    barcodeStream.getTracks().forEach((track) => track.stop());
    barcodeStream = null;
  }
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  if (video) {
    video.pause();
    video.srcObject = null;
  }
  if (panel) panel.hidden = true;
}
function openPickerModal() {
  stopBarcodeScan();
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  pickerModal();
}
function pickerModal() {
  const hasSelected = state.products.some(
      (p) => (state.workerQty[p.id] || 0) > 0,
    ),
    products = pickerProductsInView();
  ensurePickerActiveId();
  const qtySheet = state.pickerQtyProductId
    ? pickerQtySheetHtml(state.pickerQtyProductId)
    : "";
  box(
    pickerModalTitleHtml(),
    `<div class="picker-step2 picker-panel${state.pickerQtyProductId ? " picker-step2--qty-open" : ""}" data-picker-root><div class="picker-step2__toolbar">${pickerCategoryChipsHtml()}</div><div class="picker-step2__scroll"><div class="picker-list" data-picker-products>${products.length ? products.map((p) => pickerRow(p)).join("") : `<div class="picker-panel__empty">Бараа олдсонгүй</div>`}</div></div><footer class="picker-step2__bottom picker-step2__bottom--actions"><div class="picker-footer"><button type="button" data-picker-clear-cart class="btn btn--secondary btn--block${hasSelected ? "" : " is-disabled"}" ${hasSelected ? "" : "disabled"}>Цэвэрлэх</button><button type="button" onclick="closeModal();render()" class="btn btn--primary btn--block">Дуусгах</button></div></footer>${qtySheet}</div>`,
    "max-w-2xl",
    {
      titleId: "picker-order-title",
      dialog: true,
      titleHtml: !!pickerModalCustomer(),
      panelClass: "modal-panel--picker",
    },
  );
}
function backToPickerCategories() {
  setPickerCategory("");
}
function clearPickerCart() {
  resetWorkerCart();
  render();
  pickerModal();
}
function pickerQtyChange(productId, qty) {
  setWorkerQty(productId, qty);
}
function openPickerQtySheet(productId) {
  if (!state.products.some((p) => p.id === productId)) return;
  if (state.pickerQtyProductId && state.pickerQtyProductId !== productId) {
    finishPickerEditFor(state.pickerQtyProductId);
  }
  state.pickerQtyProductId = productId;
  state.pickerActiveId = productId;
  pickerModal();
}
function closePickerQtySheet() {
  const id = state.pickerQtyProductId;
  state.pickerQtyProductId = "";
  state.pickerActiveId = "";
  if (id) setWorkerQty(id, 0);
  if (pickerOpen()) pickerModal();
}
function pickerQtySheetHtml(productId) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return "";
  const id = esc(p.id);
  const q = getWorkerQty(p.id);
  const packSize = productPackSize(p);
  const { packs, pieces } = pickerQtyToParts(q, p);
  const qtyBody = packSize
    ? `<div class="picker-qty-sheet__qty"><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Багц</span><span class="picker-qty-sheet__row-hint">Багц = ${packSize}ш</span></div>${pickerPartStepperHtml(p, packs, { kind: "pack", max: pickerPackMax(p, pieces), sheet: true })}</div><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Тоо ширхэг</span></div>${pickerPartStepperHtml(p, pieces, { kind: "piece", max: pickerPieceMax(p, packs), sheet: true })}</div><p class="picker-qty-sheet__total">Нийт: <b data-picker-qty-total>${q} ш</b></p></div>`
    : `<div class="picker-qty-sheet__qty"><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Тоо ширхэг</span></div>${pickerQtyStepperHtml(p, q, { sheet: true })}</div><p class="picker-qty-sheet__total">Нийт: <b data-picker-qty-total>${q} ш</b></p></div>`;
  return `<div class="picker-qty-sheet" data-picker-qty-sheet role="dialog" aria-modal="true" aria-labelledby="picker-qty-title"><button type="button" class="picker-qty-sheet__backdrop" data-picker-qty-close aria-label="Хаах"></button><div class="picker-qty-sheet__panel"><div class="picker-qty-sheet__head"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" data-product-img alt="" class="picker-qty-sheet__thumb product-thumb"><div class="picker-qty-sheet__info"><h4 id="picker-qty-title" class="picker-qty-sheet__name">${esc(p.name)}</h4><p class="picker-qty-sheet__meta">${fmt(p.price)} · Үлд ${p.stock} ${esc(p.unit || "ш")}</p></div></div>${qtyBody}<div class="picker-qty-sheet__actions"><button type="button" data-picker-qty-close class="btn btn--secondary btn--block">Болих</button><button type="button" data-picker-qty-done data-product-id="${id}" class="btn btn--primary btn--block">Болсон</button></div></div></div>`;
}
function pickerRow(p) {
  const q = getWorkerQty(p.id),
    inCart = q > 0,
    left = p.stock - q,
    qtyBadge = inCart
      ? `<span class="picker-row__qty" aria-label="Сонгосон ${q} ш">${q} ш</span>`
      : "";
  return `<button type="button" class="picker-row${inCart ? " is-selected" : ""}" data-picker-open="${esc(p.id)}" aria-label="${esc(p.name)} — тоо сонгох"><img src="${productImageSrcAttr(p)}" referrerpolicy="no-referrer" ${productImgDataAttrs(p)} class="picker-row__thumb" loading="lazy" decoding="async"><div class="picker-row__info"><span class="picker-row__name">${esc(p.name)}</span><span class="picker-row__meta"><span class="picker-row__value--price">${fmt(p.price)}</span><span class="picker-row__meta-sep">·</span><span class="picker-row__value--stock${left <= 10 ? " picker-row__value--stock-low" : ""}">Үлд ${left}</span></span></div>${qtyBadge}</button>`;
}
function setPickerCategory(cat) {
  state.filters.workerCategory = cat || "";
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  if (refreshPickerList()) return;
  pickerModal();
}
function toggleWorker(id) {
  if (!canPickWarehouseWorkers()) return;
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
  render();
}
function selectWarehouseOrder(id) {
  state.selectedWarehouseOrderId = id;
  warehouseReceiptScrollId = id;
  render();
}
function workerSelectModal() {
  if (!canPickWarehouseWorkers()) return;
  const agents = salesOrderAgents();
  box(
    "Ажилтан сонгох",
    `<div class="p-5 space-y-3" data-worker-select-modal>${agents
      .map(
        (e) =>
          `<label class="flex items-center gap-3 bg-secondary rounded p-3"><input type="checkbox" ${state.selectedWorkers.includes(e.id) ? "checked" : ""} onchange="toggleWorkerOnly('${e.id}')"><span class="font-medium">${esc(e.name)}</span><span class="text-xs text-muted-foreground">${role(e.role)}</span></label>`,
      )
      .join(
        "",
      )}<button onclick="finishWorkerSelect()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Болсон</button></div>`,
    "max-w-md",
  );
}
function finishWorkerSelect() {
  closeModal();
  render();
}
function storePickerSearch(value) {
  state.searches.workerStore = value;
  storePickerModal();
}
function selectWorkerCustomer(id) {
  pickWorkerStore(id);
  closeModal();
}
function storePickerModal() {
  const q = state.searches.workerStore || "",
    selected = state.customers.find((c) => c.id === state.workerCustomer),
    rows = sortCustomersByName(
      state.customers.filter((c) => customerMatchesQuery(c, q)),
    );
  box(
    "Харилцагч сонгох",
    `<div class="p-5 space-y-4 modal-scroll overflow-y-auto max-h-[80vh]"><input data-store-search value="${esc(state.searches.workerStore || "")}" oninput="storePickerSearch(this.value)" placeholder="Нэр, РД-ээр хайх..." class="w-full px-3 py-3 bg-secondary rounded"><div class="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3"><div class="store-picker-list space-y-2">${rows.length ? rows.map((c) => `<button type="button" onclick="state.workerCustomer='${c.id}';storePickerModal()" class="w-full text-left rounded p-3 ${state.workerCustomer === c.id ? "bg-primary/10 border border-primary" : "bg-secondary/50"}"><p class="font-medium">${c.name}</p><p class="text-xs text-muted-foreground">${c.companyName || "-"} · ${customerPhonesList(c)[0] || "-"}</p></button>`).join("") : `<p class="text-sm text-muted-foreground p-3">Харилцагч олдсонгүй</p>`}</div><div>${selected ? workerStoreSummary(selected) : `<p class="text-sm text-muted-foreground">Жагсаалтаас харилцагч сонгоно уу</p>`}</div></div><button onclick="selectWorkerCustomer(state.workerCustomer)" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium" ${selected ? "" : "disabled"}>Сонгох</button></div>`,
    "max-w-3xl",
  );
  const el = document.querySelector("[data-store-search]");
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function toggleWorkerOnly(id) {
  if (!canPickWarehouseWorkers()) return;
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
  workerSelectModal();
}
function employeeExcel() {
  const orders = warehouseOrdersForSelectedWorkers(),
    workerIds = warehouseActiveWorkerIds(orders);
  if (!orders.length || !workerIds.length)
    return alert(
      state.selectedWorkers.length
        ? "Сонгосон ХТ дээр захиалга алга"
        : "Ажилтан сонгоно уу",
    );
  return exportWarehousePrepareExcel(orders, workerIds);
}
async function saveWorker() {
  if (orderSubmitLock) return;
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const c = state.customers.find((x) => x.id === state.workerCustomer);
  if (!c) return alert("Харилцагч сонгоно уу");
  const e = orderActor();
  if (!e?.id) return alert("Худалдааны төлөөлөгч сонгоно уу");
  const cart = workerCartSummary();
  if (!cart.paid.length) return alert("Бараа сонгоно уу");
  if (state.applyPercentDiscount && !workerPercentDiscountActive())
    state.applyPercentDiscount = false;
  const items = cart.all,
    percentDiscount = workerPercentDiscountActive() ? percentDiscountRate() : 0;
  const settlementText = state.settlementAgreed
    ? settlementTextInputValue(state)
    : "";
  if (state.settlementAgreed && !settlementText)
    return alert("Тайлбар оруулна уу");
  const stockIssues = orderStockIssues(items);
  if (alertOrderStockIssues(stockIssues)) return;
  orderSubmitLock = true;
  render();
  try {
    const order = buildNewOrder({
      customerId: c.id,
      customerName: c.name,
      items,
      grossTotal: cart.gross,
      applyPercentDiscount: workerPercentDiscountActive(),
      percentDiscount,
      discountAmount: cart.discount,
      total: cart.total,
      settlementAgreed: !!settlementText,
      settlementText,
      settlementMonth: "",
      settlementDay: "",
      status: "pending",
      employeeId: e.id,
      employeeName: e.name,
      employeePhone: e.phone || "",
      ...orderEmailFields(e),
      isPaid: paidFromPaymentTerm(state.paymentTerm),
      paymentTerm: state.paymentTerm,
      deliveryDate: todayIso(),
      ...deliveryFieldsForNewOrder(),
    });
    state.orders.push(order);
    applyOrderStock(items);
    resetWorkerCart();
    state.workerStoreReady = false;
    state.workerCustomer = "";
    state.deliveryDate = "";
    state.settlementAgreed = false;
    state.settlementText = "";
    state.settlementMonth = "";
    state.settlementDay = "";
    state.applyPercentDiscount = false;
    state.filters.worker = "orders";
    state.workerOrdersArrived = true;
    state.workerHighlightOrderId = order.id;
    persistOrderSnapshot();
    render();
    pushAppHistory();
    const saved = await flushBackendSave();
    if (saved) {
      showAppToast("Захиалга хадгалагдлаа", "success");
    } else {
      showAppToast(
        "Захиалга хадгалагдлаа, серверт илгээхэд алдаа гарлаа",
        "error",
      );
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-order-id="${order.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    setTimeout(() => {
      if (!state.workerOrdersArrived) return;
      state.workerOrdersArrived = false;
      if (state.currentView === "worker" && state.filters.worker === "orders") {
        render();
      }
    }, 1300);
  } catch (error) {
    console.warn("Order save failed", error);
    alert("Захиалга хадгалахад алдаа гарлаа");
  } finally {
    orderSubmitLock = false;
    render();
  }
}
function login(e) {
  e.preventDefault();
  ensureEmployeeEmails();
  const email = normalizeEmail(document.getElementById("loginEmail").value),
    password = document.getElementById("loginPassword").value.trim();
  const emp = state.employees.find(
    (x) => normalizeEmail(x.email) === email && x.password === password,
  );
  if (!emp)
    return (document.getElementById("loginError").innerHTML =
      `<div class="tone tone--danger text-sm p-3 rounded text-center">Email эсвэл нууц үг буруу байна</div>`);
  saveLoginCredentials(
    email,
    password,
    document.getElementById("loginRemember")?.checked,
  );
  state.currentEmployee = emp;
  state.isLoggedIn = true;
  loginFormActiveUntil = 0;
  state.orderEmployee = emp.id;
  applyLoginRoleDefaults(emp);
  ensureOrderEmployeeSelection();
  state.currentView = defaultViewForRole(emp.role);
  saveAuthSession();
  render();
}
function closeConfirmCard() {
  pendingConfirm = null;
  receiptEditQtyConfirmOpen = false;
  const overlay = document.getElementById("confirm-card-overlay");
  if (overlay) overlay.hidden = true;
}
function initConfirmCard() {
  const overlay = document.getElementById("confirm-card-overlay");
  if (!overlay || overlay.dataset.bound) return;
  overlay.dataset.bound = "1";
  overlay
    .querySelector("#confirm-card-yes")
    ?.addEventListener("click", async () => {
      const fn = pendingConfirm?.onConfirm;
      closeConfirmCard();
      try {
        await fn?.();
      } catch (err) {
        console.warn("Confirm action failed", err);
        alert("Алдаа гарлаа. Дахин оролдоно уу.");
      }
    });
  overlay.querySelector("#confirm-card-no")?.addEventListener("click", () => {
    const fn = pendingConfirm?.onCancel;
    closeConfirmCard();
    fn?.();
  });
  overlay
    .querySelector("#confirm-card-close")
    ?.addEventListener("click", () => {
      const fn = pendingConfirm?.onCancel;
      closeConfirmCard();
      fn?.();
    });
  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    const fn = pendingConfirm?.onCancel;
    closeConfirmCard();
    fn?.();
  });
}
function initConfirmDeleteActions() {
  if (document.documentElement.dataset.confirmDeleteBound) return;
  document.documentElement.dataset.confirmDeleteBound = "1";
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("[data-confirm-delete]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      confirmDelete(
        btn.getAttribute("data-confirm-delete") || "",
        btn.getAttribute("data-id") || "",
      );
    },
    true,
  );
}
let pendingConfirm = null;
function showConfirmCard({
  title,
  message,
  confirmLabel,
  cancelLabel = "Үгүй",
  onConfirm,
  onCancel,
  danger = false,
  single = false,
  closable = false,
}) {
  initConfirmCard();
  const overlay = document.getElementById("confirm-card-overlay");
  if (!overlay) return;
  pendingConfirm = { onConfirm, onCancel };
  const titleEl = overlay.querySelector("#confirm-card-title");
  const messageEl = overlay.querySelector("#confirm-card-message");
  const yesBtn = overlay.querySelector("#confirm-card-yes");
  const noBtn = overlay.querySelector("#confirm-card-no");
  const closeBtn = overlay.querySelector("#confirm-card-close");
  const actions = overlay.querySelector(".confirm-card__actions");
  if (titleEl) titleEl.textContent = title || "";
  if (messageEl) messageEl.innerHTML = message || "";
  if (yesBtn) {
    yesBtn.textContent = confirmLabel || "Тийм";
    yesBtn.className = `confirm-card__btn ${danger ? "confirm-card__btn--danger" : "confirm-card__btn--confirm"}`;
  }
  if (noBtn) {
    noBtn.hidden = !!single || cancelLabel === "";
    noBtn.textContent = cancelLabel || "Үгүй";
  }
  if (closeBtn) closeBtn.hidden = !closable;
  actions?.classList.toggle("confirm-card__actions--single", !!single);
  overlay.hidden = false;
  yesBtn?.focus();
}
function alertModal(title, messageHtml) {
  showConfirmCard({
    title,
    message: messageHtml,
    confirmLabel: "Ойлголоо",
    onConfirm: () => {},
    single: true,
  });
}
function confirmModal(
  title,
  messageHtml,
  {
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    danger = false,
    closable = false,
  } = {},
) {
  if (!confirmLabel || !onConfirm) return;
  showConfirmCard({
    title,
    message: messageHtml,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    danger,
    closable,
  });
}
function confirmLogout() {
  confirmModal(
    "Системээс гарах",
    `Та <b>${esc(state.currentEmployee?.name || "")}</b> хэрэглэгчээр системээс гарах уу? Хадгалаагүй өөрчлөлт алдагдахгүй.`,
    {
      confirmLabel: "Гарах",
      onConfirm: () => {
        closeModal();
        logout();
      },
      danger: true,
    },
  );
}
function logout() {
  closeModal();
  const finishLogout = () => {
    clearTimeout(backendSaveTimer);
    backendSaveTimer = null;
    state.currentEmployee = null;
    state.isLoggedIn = false;
    state.mobileOpen = false;
    localStorage.removeItem(AUTH_SESSION_KEY);
    mountLoginView(true);
    return;
  };
  if (backendReady && localStateDirty() && state.currentEmployee?.id) {
    flushBackendSave().finally(finishLogout);
    return;
  }
  finishLogout();
}
async function saveEmployee(e) {
  e.preventDefault();
  if (employeeImageCompressTask) {
    try {
      await employeeImageCompressTask;
    } catch {
      return;
    }
  }
  const form = e.target?.closest?.("[data-employee-form]");
  if (!form) return;
  const editId = form.getAttribute("data-employee-id") || "";
  if (
    editId
      ? !hasPermission("employees.edit")
      : !hasPermission("employees.create")
  ) {
    alertModal("Эрхгүй", "Ажилтан хадгалах эрхгүй.");
    return;
  }
  const built = buildEmployeeDataFromForm(form, editId);
  if (built.error) return alert(built.error);
  await applyEmployeeSave(built.data, editId);
}
function confirmDelete(type, id) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
  const item =
    type === "product"
      ? state.products.find((p) => p.id === id)
      : type === "employee"
        ? state.employees.find((e) => e.id === id)
        : type === "customer"
          ? state.customers.find((c) => c.id === id)
          : null;
  const name =
    item?.name || (type === "customer" ? item?.companyName : null) || "энэ мөр";
  const finalMessage = `<strong>${esc(name)}</strong>-г бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.`;
  confirmModal(
    "Устгах уу?",
    `<strong>${esc(name)}</strong> устгах гэж байна.`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => {
        confirmModal("Баталгаажуулах", finalMessage, {
          confirmLabel: "Батлах",
          onConfirm: () => deleteNow(type, id),
          danger: true,
          closable: true,
        });
      },
    },
  );
}
function confirmCancelOrder(id) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
  const o = state.orders.find((x) => x.id === id);
  const name = o?.customerName || "захиалга";
  confirmModal(
    "Цуцлах уу?",
    `<strong>${esc(name)}</strong> захиалгыг цуцлах гэж байна.`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => cancelOrderNow(id),
      danger: true,
    },
  );
}
function cancelOrderNow(id) {
  if (!canDelete()) return;
  setOrder(id, "cancelled");
}
function confirmDeleteReceipt(id) {
  if (!canDeleteReceipt()) {
    return alertModal("Эрхгүй", "Баримт устгах эрхгүй.");
  }
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  const label = `${formatReceiptNumber(o)} · ${o.customerName || "Захиалга"}`;
  confirmModal(
    "Баримт устгах уу?",
    `<p><b>${esc(label)}</b> баримтыг устгах гэж байна.</p><p class="text-sm text-muted-foreground mt-2">Баримт устгавал холбоотой захиалга мөн устана. Цуцлагдаагүй бол барааны үлдэгдэл буцааж нэмэгдэнэ.</p>`,
    {
      confirmLabel: "Тийм",
      danger: true,
      onConfirm: () => {
        confirmModal(
          "Баталгаажуулах",
          `<p><b>${esc(label)}</b>-г бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.</p>`,
          {
            confirmLabel: "Устгах",
            danger: true,
            closable: true,
            onConfirm: () => deleteReceiptNow(id),
          },
        );
      },
    },
  );
}
function deleteReceiptNow(id) {
  if (!canDeleteReceipt()) return;
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  const receiptLabel = formatReceiptNumber(o);
  if (o.status !== "cancelled") {
    (o.items || []).forEach((i) => {
      if (i?.productId && i.quantity) stock(i.productId, i.quantity, "in");
    });
  }
  recordDeletion("order", id);
  state.orders = state.orders.filter((x) => x.id !== id);
  if (state.selectedWarehouseOrderId === id) {
    state.selectedWarehouseOrderId = "";
    warehouseReceiptScrollId = "";
  }
  state.receiptPrintOrderIds = idList(state.receiptPrintOrderIds).filter(
    (x) => x !== id,
  );
  if (state.receiptEditOrderId === id) clearReceiptEdit();
  closeModal();
  render();
  showAppToast(`Баримт ${receiptLabel} устгагдлаа`, "success");
  criticalBackendSave();
}
function recordDeletion(type, id) {
  if (!["product", "customer", "employee", "order"].includes(type) || !id)
    return;
  state.deletionLog = normalizeDeletionLog([
    ...(state.deletionLog || []),
    {
      type,
      id,
      deletedAt: new Date().toISOString(),
      actorId: state.currentEmployee?.id || "",
    },
  ]);
}
function deleteNow(type, id) {
  if (!canDelete()) return;
  const label =
    type === "product"
      ? "Бараа"
      : type === "employee"
        ? "Ажилтан"
        : type === "customer"
          ? "Харилцагч"
          : "Мөр";
  if (type === "product") {
    recordDeletion("product", id);
    state.products = state.products.filter((p) => p.id !== id);
  }
  if (type === "employee") {
    recordDeletion("employee", id);
    state.employees = state.employees.filter((e) => e.id !== id);
    if (state.currentEmployee?.id === id) {
      state.currentEmployee = null;
      state.isLoggedIn = false;
    }
  }
  if (type === "customer") {
    recordDeletion("customer", id);
    state.customers = state.customers.filter((c) => c.id !== id);
    if (state.workerCustomer === id) {
      state.workerCustomer = "";
      state.workerStoreReady = false;
      resetWorkerCart();
    }
  }
  closeModal();
  render();
  showAppToast(`${label} устгагдлаа`, "success");
  criticalBackendSave();
}
function delEmployee(id) {
  confirmDelete("employee", id);
}
function delProduct(id) {
  confirmDelete("product", id);
}
function setOrder(id, s) {
  if (s === "cancelled" && !canDelete()) return;
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  if (s === "cancelled" && o.status !== "cancelled") {
    (o.items || []).forEach((i) => {
      if (i?.productId && i.quantity) stock(i.productId, i.quantity, "in");
    });
  }
  o.status = s;
  render();
  criticalBackendSave();
}
function setPaid(id, isPaid) {
  const o = state.orders.find((order) => order.id === id);
  if (!o) return;
  const customerId = o.customerId;
  o.isPaid = isPaid;
  render();
  if (customerId) refreshCustomerEditReceivable(customerId);
  criticalBackendSave();
}
function csvRow(cells) {
  return cells
    .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
    .join(",");
}
function csv(name, rows) {
  const blob = new Blob(["\uFEFF" + rows.map(csvRow).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  void downloadBlobFile(blob, name);
}
function xlsxFileName(name) {
  const base = String(name || "excel.xlsx")
    .trim()
    .replace(/\.(xlsx|xls|csv)$/i, "");
  return `${base || "excel"}.xlsx`;
}
function xlsxSheetTitle(name = "Sheet1") {
  const title = String(name || "Sheet1")
    .replace(/[:\\/?*\[\]]/g, " ")
    .trim();
  return (title || "Sheet1").slice(0, 31);
}
function simpleWorkbookXml(sheetName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xlsxXmlEsc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}
function simpleWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
}
function simpleRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}
function simpleContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;
}
function simpleSheetXml(rows, si) {
  const normalizedRows = (rows || []).map((row) =>
    Array.isArray(row) ? row : [row],
  );
  const rowCount = Math.max(normalizedRows.length, 1);
  const colCount = Math.max(1, ...normalizedRows.map((row) => row.length));
  const lastRef = `${xlsxColName(colCount)}${rowCount}`;
  const sheetRows = normalizedRows
    .map((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const cells = [];
      for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
        const ref = `${xlsxColName(colIdx + 1)}${rowNum}`;
        const value = row[colIdx];
        if (value === null || value === undefined || value === "") {
          cells.push(`<c r="${ref}"/>`);
          continue;
        }
        const numberValue = typeof value === "number" ? value : Number(value);
        if (typeof value === "number" && Number.isFinite(numberValue)) {
          cells.push(`<c r="${ref}"><v>${numberValue}</v></c>`);
        } else {
          cells.push(`<c r="${ref}" t="s"><v>${si(value)}</v></c>`);
        }
      }
      return `<row r="${rowNum}" spans="1:${colCount}">${cells.join("")}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}
async function downloadRowsXlsx(name, rows, sheetName = "Sheet1") {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const safeSheetName = xlsxSheetTitle(sheetName);
  const zip = new JSZip();
  const opt = zipFileOptions({ binary: false });
  zip.file("[Content_Types].xml", simpleContentTypesXml(), opt);
  zip.file("_rels/.rels", simpleRootRelsXml(), opt);
  zip.file("xl/workbook.xml", simpleWorkbookXml(safeSheetName), opt);
  zip.file("xl/_rels/workbook.xml.rels", simpleWorkbookRelsXml(), opt);
  zip.file("xl/worksheets/sheet1.xml", simpleSheetXml(rows, si), opt);
  zip.file("xl/sharedStrings.xml", xlsxSharedStringsXml(strings), opt);
  const blob = await zipToExcelBlob(zip);
  await downloadBlobFile(blob, xlsxFileName(name));
}
function excel(name, rows) {
  downloadRowsXlsx(name, rows).catch(() =>
    csv(String(name || "excel.xlsx").replace(/\.(xlsx|xls)$/i, ".csv"), rows),
  );
}
Object.assign(window, {
  state,
  go,
  appBack,
  search,
  render,
  scrollPageToTop,
  closeModal,
  confirmEditCustomer,
  confirmEditProduct,
  confirmEditEmployee,
  dialPhoneNumber,
  addCustomerPhoneField,
  removeCustomerPhoneField,
  customerModal,
  handleCustomerImage,
  clearCustomerImage,
  handleEmployeeImage,
  clearEmployeeImage,
  onCustomerProvinceChange,
  onCustomerDistrictChange,
  initCustomerAddressFields,
  confirmCustomerExcel,
  downloadImportTemplate,
  confirmProductsExport,
  confirmInventoryExport,
  confirmFinishStockIn,
  confirmNewStockIn,
  confirmStockInExcel,
  setStockInEmployee,
  setStockOutEmployee,
  stockInEntryModal,
  applyStockInEntryModal,
  stockInQtyFieldsInput,
  confirmReportExport,
  confirmEmployeeExcel,
  confirmOrderReceiptsExcel,
  confirmWarehouseReceiptsExcel,
  confirmVisibleOrderReceiptsExcel,
  confirmSingleOrderReceiptExcel,
  exportOrderReceiptsExcel,
  customerExcel,
  deliveryPickerModal,
  deliveryPickerSearch,
  selectDeliveryEmployee,
  clearDeliveryEmployee,
  centerCustomerMapOnUser,
  openDeviceLocationSettings,
  saveCustomer,
  customerDetail,
  productDetail,
  productModal,
  handleProductImage,
  applySettlementTextInput,
  growSettlementInput,
  settlementInputFocus,
  settlementInputBlur,
  fillProductFromBarcode,
  fillCustomerFromRegistration,
  scheduleCustomerRegistryLookup,
  saveProduct,
  categoryModal,
  addCategory,
  confirmDeleteCategory,
  employeeModal,
  orderModal,
  saveOrder,
  orderDetail,
  orderReceiptModal,
  receiptEditQtyFocus,
  receiptEditQtyKeydown,
  receiptEditQtyDraft,
  receiptEditQtyCommit,
  receiptDetail,
  printOrderReceipt,
  printOrderReceiptNow,
  downloadOrderReceiptExcel,
  downloadOrderReceiptExcelNow,
  orderReceiptModalKeepDraft,
  workerOrderDetail,
  applyStock,
  inventoryStockModal,
  stockOutModal,
  applyStockOutModal,
  applyStockFromModal,
  setInventoryCategory,
  setInventoryTab,
  setCountCategory,
  setWorkerQty,
  setWorkerOrderActive,
  finishWorkerOrderEdit,
  finishPickerEdit,
  pickerQtyChange,
  pickerPackDraft,
  pickerPackCommit,
  pickerPieceDraft,
  pickerPieceCommit,
  qtyDraft,
  qtyCommit,
  openPickerModal,
  pickerModal,
  backToPickerCategories,
  clearPickerCart,
  setPickerCategory,
  applyPickerBarcode,
  applyStockInBarcode,
  stockInBarcodeKeydown,
  clearPickerFilter,
  startBarcodeScan,
  stopBarcodeScan,
  toggleWorker,
  selectWarehouseOrder,
  workerSelectModal,
  workerSelectedRow,
  toggleWorkerOnly,
  employeeExcel,
  finishWorkerSelect,
  storePickerModal,
  storePickerSearch,
  selectWorkerCustomer,
  pickDeliveryStore,
  clearDeliveryStore,
  pickWorkerStore,
  confirmWorkerStore,
  clearWorkerStore,
  openWorkerNewTab,
  openWorkerOrdersTab,
  clearWorkerOrderDate,
  setWorkerOrderDate,
  clearWarehouseDate,
  selectWarehouseToday,
  setWarehouseDate,
  receiptFilterToggle,
  receiptFilterClear,
  setReceiptPrintDelivery,
  toggleReceiptPrintDelivery,
  toggleReceiptPrintDeliveryPicker,
  closeReceiptPrintDeliveryPicker,
  clearReceiptPrintDelivery,
  toggleReceiptPrintWorker,
  toggleReceiptPrintWorkerPicker,
  closeReceiptPrintWorkerPicker,
  clearReceiptPrintWorkers,
  armWhReceiptPickerDismissGuard,
  toggleReceiptPrintOrder,
  printSelectedOrderReceipts,
  printOrderReceiptsNow,
  scrollWorkerOrdersToDate,
  toolbarSelectFocus,
  toolbarSelectBlur,
  setProductCategory,
  setOrderStatusFilter,
  setWorkerPayFilter,
  receiptStatusFilterFocus,
  receiptStatusFilterBlur,
  openPromotionQtyModal,
  openPromotionPage,
  promotionQtyModal,
  promoProductSearch,
  selectPromoProduct,
  promoPickSearch,
  setPromoPickCategory,
  promoFormDraftField,
  addPromoPickProduct,
  removePromoPickProduct,
  promoBuyProductSearch,
  addPromoBuyProduct,
  removePromoBuyProduct,
  openPromotionPriceModal,
  promotionPriceModal,
  setPromotionPriceRuleType,
  openPromotionPaymentModal,
  promotionPaymentModal,
  setPromotionPaymentRuleType,
  setPromotionPaymentTerm,
  savePromotionQty,
  savePromotionPrice,
  savePromotionPayment,
  removePromotionRule,
  confirmRemovePromotionRule,
  removePromotionRuleNow,
  excel,
  saveWorker,
  login,
  toggleLoginPassword,
  togglePasswordField,
  confirmLogout,
  closeConfirmCard,
  logout,
  saveEmployee,
  confirmDelete,
  confirmCancelOrder,
  cancelOrderNow,
  confirmDeleteReceipt,
  deleteReceiptNow,
  deleteNow,
  delEmployee,
  delProduct,
  setOrder,
  setPaid,
  confirmSetPaid,
  setReportDate,
  clearReportDate,
  reportOrdersFiltered,
  setPaymentTerm,
  csv,
  finishCount,
  confirmFinishCount,
  confirmNewCount,
  confirmCountExcel,
  exportCountExcel,
  setCountQty,
  ensureCountSessionQuiet,
  countQtyFocus,
  countQtyInput,
  countQtyCommit,
  saveStockAlertSettings,
  stockAlertModal,
  percentDiscountSettingsModal,
  savePercentDiscountSettings,
  orderRetentionSettingsModal,
  saveOrderRetentionSettings,
  deletionLogModal,
  retryPendingBackendSave,
  syncEmployeePermissionsFromRole,
  openEmployeePermissionsPage,
  togglePermissionEmployee,
  togglePermissionEmployeePicker,
  closePermissionEmployeePicker,
  clearPermissionEmployees,
  saveGrantedPermissions,
  saveBackendState,
  installPwaApp,
  dismissPwaInstall,
  installAppOnPhone,
  dismissIosInstallCoach: dismissInstallCoach,
  dismissInstallCoach,
  showAndroidInstallCoach,
  openPwaInstallModal,
  openInChrome,
  copyAppLink,
});
boot();
