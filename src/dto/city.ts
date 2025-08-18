import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, ForeignKey, AllowNull } from 'sequelize-typescript'



@Table({
    tableName: 'city',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class City extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare state: string

    @Unique
    @AllowNull(false)	
    @Column(DataType.INTEGER)
    declare population:number 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

const SEED_DATA = [
  {
    "rank": 1,
    "name": "New York",
    "state": "NY",
    "population": 8804190
  },
  {
    "rank": 2,
    "name": "Los Angeles",
    "state": "CA",
    "population": 3898747
  },
  {
    "rank": 3,
    "name": "Chicago",
    "state": "IL",
    "population": 2746388
  },
  {
    "rank": 4,
    "name": "Houston",
    "state": "TX",
    "population": 2304580
  },
  {
    "rank": 5,
    "name": "Phoenix",
    "state": "AZ",
    "population": 1608139
  },
  {
    "rank": 6,
    "name": "Philadelphia",
    "state": "PA",
    "population": 1603797
  },
  {
    "rank": 7,
    "name": "San Antonio",
    "state": "TX",
    "population": 1434625
  },
  {
    "rank": 8,
    "name": "San Diego",
    "state": "CA",
    "population": 1386932
  },
  {
    "rank": 9,
    "name": "Dallas",
    "state": "TX",
    "population": 1304379
  },
  {
    "rank": 10,
    "name": "San Jose",
    "state": "CA",
    "population": 1013240
  },
  {
    "rank": 11,
    "name": "Austin",
    "state": "TX",
    "population": 961855
  },
  {
    "rank": 12,
    "name": "Jacksonville",
    "state": "FL",
    "population": 949611
  },
  {
    "rank": 13,
    "name": "Fort Worth",
    "state": "TX",
    "population": 918915
  },
  {
    "rank": 14,
    "name": "Columbus",
    "state": "OH",
    "population": 905748
  },
  {
    "rank": 15,
    "name": "Indianapolis",
    "state": "IN",
    "population": 887642
  },
  {
    "rank": 16,
    "name": "Charlotte",
    "state": "NC",
    "population": 874579
  },
  {
    "rank": 17,
    "name": "San Francisco",
    "state": "CA",
    "population": 873965
  },
  {
    "rank": 18,
    "name": "Seattle",
    "state": "WA",
    "population": 737015
  },
  {
    "rank": 19,
    "name": "Denver",
    "state": "CO",
    "population": 715522
  },
  {
    "rank": 20,
    "name": "Washington",
    "state": "DC",
    "population": 689545
  },
  {
    "rank": 21,
    "name": "Nashville",
    "state": "TN",
    "population": 689447
  },
  {
    "rank": 22,
    "name": "Oklahoma City",
    "state": "OK",
    "population": 681054
  },
  {
    "rank": 23,
    "name": "El Paso",
    "state": "TX",
    "population": 678815
  },
  {
    "rank": 24,
    "name": "Boston",
    "state": "MA",
    "population": 675647
  },
  {
    "rank": 25,
    "name": "Portland",
    "state": "OR",
    "population": 652503
  },
  {
    "rank": 26,
    "name": "Las Vegas",
    "state": "NV",
    "population": 641903
  },
  {
    "rank": 27,
    "name": "Detroit",
    "state": "MI",
    "population": 639111
  },
  {
    "rank": 28,
    "name": "Memphis",
    "state": "TN",
    "population": 633104
  },
  {
    "rank": 29,
    "name": "Louisville",
    "state": "KY",
    "population": 633045
  },
  {
    "rank": 30,
    "name": "Baltimore",
    "state": "MD",
    "population": 585708
  },
  {
    "rank": 31,
    "name": "Milwaukee",
    "state": "WI",
    "population": 577222
  },
  {
    "rank": 32,
    "name": "Albuquerque",
    "state": "NM",
    "population": 564559
  },
  {
    "rank": 33,
    "name": "Tucson",
    "state": "AZ",
    "population": 542629
  },
  {
    "rank": 34,
    "name": "Fresno",
    "state": "CA",
    "population": 542107
  },
  {
    "rank": 35,
    "name": "Sacramento",
    "state": "CA",
    "population": 524943
  },
  {
    "rank": 36,
    "name": "Kansas City",
    "state": "MO",
    "population": 508090
  },
  {
    "rank": 37,
    "name": "Mesa",
    "state": "AZ",
    "population": 504258
  },
  {
    "rank": 38,
    "name": "Atlanta",
    "state": "GA",
    "population": 498715
  },
  {
    "rank": 39,
    "name": "Omaha",
    "state": "NE",
    "population": 486051
  },
  {
    "rank": 40,
    "name": "Colorado Springs",
    "state": "CO",
    "population": 478961
  },
  {
    "rank": 41,
    "name": "Raleigh",
    "state": "NC",
    "population": 467665
  },
  {
    "rank": 42,
    "name": "Long Beach",
    "state": "CA",
    "population": 466742
  },
  {
    "rank": 43,
    "name": "Virginia Beach",
    "state": "VA",
    "population": 459470
  },
  {
    "rank": 44,
    "name": "Miami",
    "state": "FL",
    "population": 442241
  },
  {
    "rank": 45,
    "name": "Oakland",
    "state": "CA",
    "population": 440646
  },
  {
    "rank": 46,
    "name": "Minneapolis",
    "state": "MN",
    "population": 429954
  },
  {
    "rank": 47,
    "name": "Tulsa",
    "state": "OK",
    "population": 413066
  },
  {
    "rank": 48,
    "name": "Bakersfield",
    "state": "CA",
    "population": 403455
  },
  {
    "rank": 49,
    "name": "Wichita",
    "state": "KS",
    "population": 397532
  },
  {
    "rank": 50,
    "name": "Arlington",
    "state": "TX",
    "population": 394266
  },
  {
    "rank": 51,
    "name": "Aurora",
    "state": "CO",
    "population": 386261
  },
  {
    "rank": 52,
    "name": "Tampa",
    "state": "FL",
    "population": 384959
  },
  {
    "rank": 53,
    "name": "New Orleans",
    "state": "LA",
    "population": 383997
  },
  {
    "rank": 54,
    "name": "Cleveland",
    "state": "OH",
    "population": 372624
  },
  {
    "rank": 55,
    "name": "Honolulu",
    "state": "HI",
    "population": 350964
  },
  {
    "rank": 56,
    "name": "Anaheim",
    "state": "CA",
    "population": 346824
  },
  {
    "rank": 57,
    "name": "Lexington",
    "state": "KY",
    "population": 322570
  },
  {
    "rank": 58,
    "name": "Stockton",
    "state": "CA",
    "population": 320804
  },
  {
    "rank": 59,
    "name": "Corpus Christi",
    "state": "TX",
    "population": 317863
  },
  {
    "rank": 60,
    "name": "Henderson",
    "state": "NV",
    "population": 317610
  },
  {
    "rank": 61,
    "name": "Riverside",
    "state": "CA",
    "population": 314998
  },
  {
    "rank": 62,
    "name": "Newark",
    "state": "NJ",
    "population": 311549
  },
  {
    "rank": 63,
    "name": "St Paul",
    "state": "MN",
    "population": 311527
  },
  {
    "rank": 64,
    "name": "Santa Ana",
    "state": "CA",
    "population": 310227
  },
  {
    "rank": 65,
    "name": "Cincinnati",
    "state": "OH",
    "population": 309317
  },
  {
    "rank": 66,
    "name": "Irvine",
    "state": "CA",
    "population": 307670
  },
  {
    "rank": 67,
    "name": "Orlando",
    "state": "FL",
    "population": 307573
  },
  {
    "rank": 68,
    "name": "Pittsburgh",
    "state": "PA",
    "population": 302971
  },
  {
    "rank": 69,
    "name": "St Louis",
    "state": "MO",
    "population": 301578
  },
  {
    "rank": 70,
    "name": "Greensboro",
    "state": "NC",
    "population": 299035
  },
  {
    "rank": 71,
    "name": "Jersey City",
    "state": "NJ",
    "population": 292449
  },
  {
    "rank": 72,
    "name": "Anchorage",
    "state": "AK",
    "population": 291247
  },
  {
    "rank": 73,
    "name": "Lincoln",
    "state": "NE",
    "population": 291082
  },
  {
    "rank": 74,
    "name": "Plano",
    "state": "TX",
    "population": 285494
  },
  {
    "rank": 75,
    "name": "Durham",
    "state": "NC",
    "population": 283506
  },
  {
    "rank": 76,
    "name": "Buffalo",
    "state": "NY",
    "population": 278349
  },
  {
    "rank": 77,
    "name": "Chandler",
    "state": "AZ",
    "population": 275987
  },
  {
    "rank": 78,
    "name": "Chula Vista",
    "state": "CA",
    "population": 275487
  },
  {
    "rank": 79,
    "name": "Toledo",
    "state": "OH",
    "population": 270871
  },
  {
    "rank": 80,
    "name": "Madison",
    "state": "WI",
    "population": 269840
  },
  {
    "rank": 81,
    "name": "Gilbert",
    "state": "AZ",
    "population": 267918
  },
  {
    "rank": 82,
    "name": "Reno",
    "state": "NV",
    "population": 264165
  },
  {
    "rank": 83,
    "name": "Fort Wayne",
    "state": "IN",
    "population": 263886
  },
  {
    "rank": 84,
    "name": "North Las Vegas",
    "state": "NV",
    "population": 262527
  },
  {
    "rank": 85,
    "name": "St Petersburg",
    "state": "FL",
    "population": 258308
  },
  {
    "rank": 86,
    "name": "Lubbock",
    "state": "TX",
    "population": 257141
  },
  {
    "rank": 87,
    "name": "Irving",
    "state": "TX",
    "population": 256684
  },
  {
    "rank": 88,
    "name": "Laredo",
    "state": "TX",
    "population": 255205
  },
  {
    "rank": 89,
    "name": "Winston Salem",
    "state": "NC",
    "population": 249545
  },
  {
    "rank": 90,
    "name": "Chesapeake",
    "state": "VA",
    "population": 249422
  },
  {
    "rank": 91,
    "name": "Glendale",
    "state": "AZ",
    "population": 248325
  },
  {
    "rank": 92,
    "name": "Garland",
    "state": "TX",
    "population": 246018
  },
  {
    "rank": 93,
    "name": "Scottsdale",
    "state": "AZ",
    "population": 241361
  },
  {
    "rank": 94,
    "name": "Norfolk",
    "state": "VA",
    "population": 238005
  },
  {
    "rank": 95,
    "name": "Boise",
    "state": "ID",
    "population": 235684
  },
  {
    "rank": 96,
    "name": "Fremont",
    "state": "CA",
    "population": 230504
  },
  {
    "rank": 97,
    "name": "Spokane",
    "state": "WA",
    "population": 228989
  },
  {
    "rank": 98,
    "name": "Santa Clarita",
    "state": "CA",
    "population": 228673
  },
  {
    "rank": 99,
    "name": "Baton Rouge",
    "state": "LA",
    "population": 227470
  },
  {
    "rank": 100,
    "name": "Richmond",
    "state": "VA",
    "population": 226610
  },
  {
    "rank": 101,
    "name": "Hialeah",
    "state": "FL",
    "population": 223109
  },
  {
    "rank": 102,
    "name": "San Bernardino",
    "state": "CA",
    "population": 222101
  },
  {
    "rank": 103,
    "name": "Tacoma",
    "state": "WA",
    "population": 219346
  },
  {
    "rank": 104,
    "name": "Modesto",
    "state": "CA",
    "population": 218464
  },
  {
    "rank": 105,
    "name": "Huntsville",
    "state": "AL",
    "population": 215006
  },
  {
    "rank": 106,
    "name": "Des Moines",
    "state": "IA",
    "population": 214133
  },
  {
    "rank": 107,
    "name": "Yonkers",
    "state": "NY",
    "population": 211569
  },
  {
    "rank": 108,
    "name": "Rochester",
    "state": "NY",
    "population": 211328
  },
  {
    "rank": 109,
    "name": "Moreno Valley",
    "state": "CA",
    "population": 208634
  },
  {
    "rank": 110,
    "name": "Fayetteville",
    "state": "NC",
    "population": 208501
  },
  {
    "rank": 111,
    "name": "Fontana",
    "state": "CA",
    "population": 208393
  },
  {
    "rank": 112,
    "name": "Columbus",
    "state": "GA",
    "population": 206922
  },
  {
    "rank": 113,
    "name": "Worcester",
    "state": "MA",
    "population": 206518
  },
  {
    "rank": 114,
    "name": "Port St Lucie",
    "state": "FL",
    "population": 204851
  },
  {
    "rank": 115,
    "name": "Little Rock",
    "state": "AR",
    "population": 202591
  },
  {
    "rank": 116,
    "name": "Augusta",
    "state": "GA",
    "population": 202081
  },
  {
    "rank": 117,
    "name": "Oxnard",
    "state": "CA",
    "population": 202063
  },
  {
    "rank": 118,
    "name": "Birmingham",
    "state": "AL",
    "population": 200733
  },
  {
    "rank": 119,
    "name": "Montgomery",
    "state": "AL",
    "population": 200603
  },
  {
    "rank": 120,
    "name": "Frisco",
    "state": "TX",
    "population": 200509
  },
  {
    "rank": 121,
    "name": "Amarillo",
    "state": "TX",
    "population": 200393
  },
  {
    "rank": 122,
    "name": "Salt Lake City",
    "state": "UT",
    "population": 199723
  },
  {
    "rank": 123,
    "name": "Grand Rapids",
    "state": "MI",
    "population": 198917
  },
  {
    "rank": 124,
    "name": "Huntington Beach",
    "state": "CA",
    "population": 198711
  },
  {
    "rank": 125,
    "name": "Overland Park",
    "state": "KS",
    "population": 197238
  },
  {
    "rank": 126,
    "name": "Glendale",
    "state": "CA",
    "population": 196543
  },
  {
    "rank": 127,
    "name": "Tallahassee",
    "state": "FL",
    "population": 196169
  },
  {
    "rank": 128,
    "name": "Grand Prairie",
    "state": "TX",
    "population": 196100
  },
  {
    "rank": 129,
    "name": "McKinney",
    "state": "TX",
    "population": 195308
  },
  {
    "rank": 130,
    "name": "Cape Coral",
    "state": "FL",
    "population": 194016
  },
  {
    "rank": 131,
    "name": "Sioux Falls",
    "state": "SD",
    "population": 192517
  },
  {
    "rank": 132,
    "name": "Peoria",
    "state": "AZ",
    "population": 190985
  },
  {
    "rank": 133,
    "name": "Providence",
    "state": "RI",
    "population": 190934
  },
  {
    "rank": 134,
    "name": "Vancouver",
    "state": "WA",
    "population": 190915
  },
  {
    "rank": 135,
    "name": "Knoxville",
    "state": "TN",
    "population": 190740
  },
  {
    "rank": 136,
    "name": "Akron",
    "state": "OH",
    "population": 190469
  },
  {
    "rank": 137,
    "name": "Shreveport",
    "state": "LA",
    "population": 187593
  },
  {
    "rank": 138,
    "name": "Mobile",
    "state": "AL",
    "population": 187041
  },
  {
    "rank": 139,
    "name": "Brownsville",
    "state": "TX",
    "population": 186738
  },
  {
    "rank": 140,
    "name": "Newport News",
    "state": "VA",
    "population": 186247
  },
  {
    "rank": 141,
    "name": "Fort Lauderdale",
    "state": "FL",
    "population": 182760
  },
  {
    "rank": 142,
    "name": "Chattanooga",
    "state": "TN",
    "population": 181099
  },
  {
    "rank": 143,
    "name": "Tempe",
    "state": "AZ",
    "population": 180587
  },
  {
    "rank": 144,
    "name": "Aurora",
    "state": "IL",
    "population": 180542
  },
  {
    "rank": 145,
    "name": "Santa Rosa",
    "state": "CA",
    "population": 178127
  },
  {
    "rank": 146,
    "name": "Eugene",
    "state": "OR",
    "population": 176654
  },
  {
    "rank": 147,
    "name": "Elk Grove",
    "state": "CA",
    "population": 176124
  },
  {
    "rank": 148,
    "name": "Salem",
    "state": "OR",
    "population": 175535
  },
  {
    "rank": 149,
    "name": "Ontario",
    "state": "CA",
    "population": 175265
  },
  {
    "rank": 150,
    "name": "Cary",
    "state": "NC",
    "population": 174721
  },
  {
    "rank": 151,
    "name": "Rancho Cucamonga",
    "state": "CA",
    "population": 174453
  },
  {
    "rank": 152,
    "name": "Oceanside",
    "state": "CA",
    "population": 174068
  },
  {
    "rank": 153,
    "name": "Lancaster",
    "state": "CA",
    "population": 173516
  },
  {
    "rank": 154,
    "name": "Garden Grove",
    "state": "CA",
    "population": 171949
  },
  {
    "rank": 155,
    "name": "Pembroke Pines",
    "state": "FL",
    "population": 171178
  },
  {
    "rank": 156,
    "name": "Fort Collins",
    "state": "CO",
    "population": 169810
  },
  {
    "rank": 157,
    "name": "Palmdale",
    "state": "CA",
    "population": 169450
  },
  {
    "rank": 158,
    "name": "Springfield",
    "state": "MO",
    "population": 169176
  },
  {
    "rank": 159,
    "name": "Clarksville",
    "state": "TN",
    "population": 166722
  },
  {
    "rank": 160,
    "name": "Salinas",
    "state": "CA",
    "population": 163542
  },
  {
    "rank": 161,
    "name": "Hayward",
    "state": "CA",
    "population": 162954
  },
  {
    "rank": 162,
    "name": "Paterson",
    "state": "NJ",
    "population": 159732
  },
  {
    "rank": 163,
    "name": "Alexandria",
    "state": "VA",
    "population": 159467
  },
  {
    "rank": 164,
    "name": "Macon",
    "state": "GA",
    "population": 157346
  },
  {
    "rank": 165,
    "name": "Corona",
    "state": "CA",
    "population": 157136
  },
  {
    "rank": 166,
    "name": "Kansas City",
    "state": "KS",
    "population": 156607
  },
  {
    "rank": 167,
    "name": "Lakewood",
    "state": "CO",
    "population": 155984
  },
  {
    "rank": 168,
    "name": "Springfield",
    "state": "MA",
    "population": 155929
  },
  {
    "rank": 169,
    "name": "Sunnyvale",
    "state": "CA",
    "population": 155805
  },
  {
    "rank": 170,
    "name": "Jackson",
    "state": "MS",
    "population": 153701
  },
  {
    "rank": 171,
    "name": "Killeen",
    "state": "TX",
    "population": 153095
  },
  {
    "rank": 172,
    "name": "Hollywood",
    "state": "FL",
    "population": 153067
  },
  {
    "rank": 173,
    "name": "Murfreesboro",
    "state": "TN",
    "population": 152769
  },
  {
    "rank": 174,
    "name": "Pasadena",
    "state": "TX",
    "population": 151950
  },
  {
    "rank": 175,
    "name": "Bellevue",
    "state": "WA",
    "population": 151854
  },
  {
    "rank": 176,
    "name": "Pomona",
    "state": "CA",
    "population": 151713
  },
  {
    "rank": 177,
    "name": "Escondido",
    "state": "CA",
    "population": 151038
  },
  {
    "rank": 178,
    "name": "Joliet",
    "state": "IL",
    "population": 150362
  },
  {
    "rank": 179,
    "name": "Charleston",
    "state": "SC",
    "population": 150227
  },
  {
    "rank": 180,
    "name": "Mesquite",
    "state": "TX",
    "population": 150108
  },
  {
    "rank": 181,
    "name": "Naperville",
    "state": "IL",
    "population": 149540
  },
  {
    "rank": 182,
    "name": "Rockford",
    "state": "IL",
    "population": 148655
  },
  {
    "rank": 183,
    "name": "Bridgeport",
    "state": "CT",
    "population": 148654
  },
  {
    "rank": 184,
    "name": "Syracuse",
    "state": "NY",
    "population": 148620
  },
  {
    "rank": 185,
    "name": "Savannah",
    "state": "GA",
    "population": 147780
  },
  {
    "rank": 186,
    "name": "Roseville",
    "state": "CA",
    "population": 147773
  },
  {
    "rank": 187,
    "name": "Torrance",
    "state": "CA",
    "population": 147067
  },
  {
    "rank": 188,
    "name": "Fullerton",
    "state": "CA",
    "population": 143617
  },
  {
    "rank": 189,
    "name": "Surprise",
    "state": "AZ",
    "population": 143148
  },
  {
    "rank": 190,
    "name": "McAllen",
    "state": "TX",
    "population": 142210
  },
  {
    "rank": 191,
    "name": "Thornton",
    "state": "CO",
    "population": 141867
  },
  {
    "rank": 192,
    "name": "Visalia",
    "state": "CA",
    "population": 141384
  },
  {
    "rank": 193,
    "name": "Olathe",
    "state": "KS",
    "population": 141290
  },
  {
    "rank": 194,
    "name": "Gainesville",
    "state": "FL",
    "population": 141085
  },
  {
    "rank": 195,
    "name": "West Valley City",
    "state": "UT",
    "population": 140230
  },
  {
    "rank": 196,
    "name": "Orange",
    "state": "CA",
    "population": 139911
  },
  {
    "rank": 197,
    "name": "Denton",
    "state": "TX",
    "population": 139869
  },
  {
    "rank": 198,
    "name": "Warren",
    "state": "MI",
    "population": 139387
  },
  {
    "rank": 199,
    "name": "Pasadena",
    "state": "CA",
    "population": 138699
  },
  {
    "rank": 200,
    "name": "Waco",
    "state": "TX",
    "population": 138486
  },
  {
    "rank": 201,
    "name": "Cedar Rapids",
    "state": "IA",
    "population": 137710
  },
  {
    "rank": 202,
    "name": "Dayton",
    "state": "OH",
    "population": 137644
  },
  {
    "rank": 203,
    "name": "Elizabeth",
    "state": "NJ",
    "population": 137298
  },
  {
    "rank": 204,
    "name": "Hampton",
    "state": "VA",
    "population": 137148
  },
  {
    "rank": 205,
    "name": "Columbia",
    "state": "SC",
    "population": 136632
  },
  {
    "rank": 206,
    "name": "Kent",
    "state": "WA",
    "population": 136588
  },
  {
    "rank": 207,
    "name": "Stamford",
    "state": "CT",
    "population": 135470
  },
  {
    "rank": 208,
    "name": "Lakewood",
    "state": "NJ",
    "population": 135158
  },
  {
    "rank": 209,
    "name": "Victorville",
    "state": "CA",
    "population": 134810
  },
  {
    "rank": 210,
    "name": "Miramar",
    "state": "FL",
    "population": 134721
  },
  {
    "rank": 211,
    "name": "Coral Springs",
    "state": "FL",
    "population": 134394
  },
  {
    "rank": 212,
    "name": "Sterling Heights",
    "state": "MI",
    "population": 134346
  },
  {
    "rank": 213,
    "name": "New Haven",
    "state": "CT",
    "population": 134023
  },
  {
    "rank": 214,
    "name": "Carrollton",
    "state": "TX",
    "population": 133434
  },
  {
    "rank": 215,
    "name": "Midland",
    "state": "TX",
    "population": 132524
  },
  {
    "rank": 216,
    "name": "Norman",
    "state": "OK",
    "population": 128026
  },
  {
    "rank": 217,
    "name": "Santa Clara",
    "state": "CA",
    "population": 127647
  },
  {
    "rank": 218,
    "name": "Athens",
    "state": "GA",
    "population": 127315
  },
  {
    "rank": 219,
    "name": "Thousand Oaks",
    "state": "CA",
    "population": 126966
  },
  {
    "rank": 220,
    "name": "Topeka",
    "state": "KS",
    "population": 126587
  },
  {
    "rank": 221,
    "name": "Simi Valley",
    "state": "CA",
    "population": 126356
  },
  {
    "rank": 222,
    "name": "Columbia",
    "state": "MO",
    "population": 126254
  },
  {
    "rank": 223,
    "name": "Vallejo",
    "state": "CA",
    "population": 126090
  },
  {
    "rank": 224,
    "name": "Fargo",
    "state": "ND",
    "population": 125990
  },
  {
    "rank": 225,
    "name": "Allentown",
    "state": "PA",
    "population": 125845
  },
  {
    "rank": 226,
    "name": "Pearland",
    "state": "TX",
    "population": 125828
  },
  {
    "rank": 227,
    "name": "Concord",
    "state": "CA",
    "population": 125410
  },
  {
    "rank": 228,
    "name": "Abilene",
    "state": "TX",
    "population": 125182
  },
  {
    "rank": 229,
    "name": "Arvada",
    "state": "CO",
    "population": 124402
  },
  {
    "rank": 230,
    "name": "Berkeley",
    "state": "CA",
    "population": 124321
  },
  {
    "rank": 231,
    "name": "Ann Arbor",
    "state": "MI",
    "population": 123851
  },
  {
    "rank": 232,
    "name": "Independence",
    "state": "MO",
    "population": 123011
  },
  {
    "rank": 233,
    "name": "Rochester",
    "state": "MN",
    "population": 121395
  },
  {
    "rank": 234,
    "name": "Lafayette",
    "state": "LA",
    "population": 121374
  },
  {
    "rank": 235,
    "name": "Hartford",
    "state": "CT",
    "population": 121054
  },
  {
    "rank": 236,
    "name": "College Station",
    "state": "TX",
    "population": 120511
  },
  {
    "rank": 237,
    "name": "Clovis",
    "state": "CA",
    "population": 120124
  },
  {
    "rank": 238,
    "name": "Fairfield",
    "state": "CA",
    "population": 119881
  },
  {
    "rank": 239,
    "name": "Palm Bay",
    "state": "FL",
    "population": 119760
  },
  {
    "rank": 240,
    "name": "Richardson",
    "state": "TX",
    "population": 119469
  },
  {
    "rank": 241,
    "name": "Round Rock",
    "state": "TX",
    "population": 119468
  },
  {
    "rank": 242,
    "name": "Cambridge",
    "state": "MA",
    "population": 118403
  },
  {
    "rank": 243,
    "name": "Meridian",
    "state": "ID",
    "population": 117635
  },
  {
    "rank": 244,
    "name": "West Palm Beach",
    "state": "FL",
    "population": 117415
  },
  {
    "rank": 245,
    "name": "Evansville",
    "state": "IN",
    "population": 117298
  },
  {
    "rank": 246,
    "name": "Clearwater",
    "state": "FL",
    "population": 117292
  },
  {
    "rank": 247,
    "name": "Billings",
    "state": "MT",
    "population": 117116
  },
  {
    "rank": 248,
    "name": "West Jordan",
    "state": "UT",
    "population": 116961
  },
  {
    "rank": 249,
    "name": "Richmond",
    "state": "CA",
    "population": 116448
  },
  {
    "rank": 250,
    "name": "Westminster",
    "state": "CO",
    "population": 116317
  },
  {
    "rank": 251,
    "name": "Manchester",
    "state": "NH",
    "population": 115644
  },
  {
    "rank": 252,
    "name": "Lowell",
    "state": "MA",
    "population": 115554
  },
  {
    "rank": 253,
    "name": "Wilmington",
    "state": "NC",
    "population": 115451
  },
  {
    "rank": 254,
    "name": "Antioch",
    "state": "CA",
    "population": 115291
  },
  {
    "rank": 255,
    "name": "Beaumont",
    "state": "TX",
    "population": 115282
  },
  {
    "rank": 256,
    "name": "Provo",
    "state": "UT",
    "population": 115162
  },
  {
    "rank": 257,
    "name": "North Charleston",
    "state": "SC",
    "population": 114852
  },
  {
    "rank": 258,
    "name": "Elgin",
    "state": "IL",
    "population": 114797
  },
  {
    "rank": 259,
    "name": "Carlsbad",
    "state": "CA",
    "population": 114746
  },
  {
    "rank": 260,
    "name": "Odessa",
    "state": "TX",
    "population": 114428
  },
  {
    "rank": 261,
    "name": "Waterbury",
    "state": "CT",
    "population": 114403
  },
  {
    "rank": 262,
    "name": "Springfield",
    "state": "IL",
    "population": 114394
  },
  {
    "rank": 263,
    "name": "League City",
    "state": "TX",
    "population": 114392
  },
  {
    "rank": 264,
    "name": "Downey",
    "state": "CA",
    "population": 114355
  },
  {
    "rank": 265,
    "name": "Gresham",
    "state": "OR",
    "population": 114247
  },
  {
    "rank": 266,
    "name": "High Point",
    "state": "NC",
    "population": 114059
  },
  {
    "rank": 267,
    "name": "Broken Arrow",
    "state": "OK",
    "population": 113540
  },
  {
    "rank": 268,
    "name": "Peoria",
    "state": "IL",
    "population": 113150
  },
  {
    "rank": 269,
    "name": "Lansing",
    "state": "MI",
    "population": 112644
  },
  {
    "rank": 270,
    "name": "Lakeland",
    "state": "FL",
    "population": 112641
  },
  {
    "rank": 271,
    "name": "Pompano Beach",
    "state": "FL",
    "population": 112046
  },
  {
    "rank": 272,
    "name": "Costa Mesa",
    "state": "CA",
    "population": 111918
  },
  {
    "rank": 273,
    "name": "Pueblo",
    "state": "CO",
    "population": 111876
  },
  {
    "rank": 274,
    "name": "Lewisville",
    "state": "TX",
    "population": 111822
  },
  {
    "rank": 275,
    "name": "Miami Gardens",
    "state": "FL",
    "population": 111640
  },
  {
    "rank": 276,
    "name": "Las Cruces",
    "state": "NM",
    "population": 111385
  },
  {
    "rank": 277,
    "name": "Sugar Land",
    "state": "TX",
    "population": 111026
  },
  {
    "rank": 278,
    "name": "Murrieta",
    "state": "CA",
    "population": 110949
  },
  {
    "rank": 279,
    "name": "Ventura",
    "state": "CA",
    "population": 110763
  },
  {
    "rank": 280,
    "name": "Everett",
    "state": "WA",
    "population": 110629
  },
  {
    "rank": 281,
    "name": "Temecula",
    "state": "CA",
    "population": 110003
  },
  {
    "rank": 282,
    "name": "Dearborn",
    "state": "MI",
    "population": 109976
  },
  {
    "rank": 283,
    "name": "Santa Maria",
    "state": "CA",
    "population": 109707
  },
  {
    "rank": 284,
    "name": "West Covina",
    "state": "CA",
    "population": 109501
  },
  {
    "rank": 285,
    "name": "El Monte",
    "state": "CA",
    "population": 109450
  },
  {
    "rank": 286,
    "name": "Greeley",
    "state": "CO",
    "population": 108795
  },
  {
    "rank": 287,
    "name": "Sparks",
    "state": "NV",
    "population": 108445
  },
  {
    "rank": 288,
    "name": "Centennial",
    "state": "CO",
    "population": 108418
  },
  {
    "rank": 289,
    "name": "Boulder",
    "state": "CO",
    "population": 108250
  },
  {
    "rank": 290,
    "name": "Sandy Springs",
    "state": "GA",
    "population": 108080
  },
  {
    "rank": 291,
    "name": "Inglewood",
    "state": "CA",
    "population": 107762
  },
  {
    "rank": 292,
    "name": "Edison",
    "state": "NJ",
    "population": 107588
  },
  {
    "rank": 293,
    "name": "South Fulton",
    "state": "GA",
    "population": 107436
  },
  {
    "rank": 294,
    "name": "Green Bay",
    "state": "WI",
    "population": 107395
  },
  {
    "rank": 295,
    "name": "Burbank",
    "state": "CA",
    "population": 107337
  },
  {
    "rank": 296,
    "name": "Renton",
    "state": "WA",
    "population": 106785
  },
  {
    "rank": 297,
    "name": "Hillsboro",
    "state": "OR",
    "population": 106447
  },
  {
    "rank": 298,
    "name": "El Cajon",
    "state": "CA",
    "population": 106215
  },
  {
    "rank": 299,
    "name": "Tyler",
    "state": "TX",
    "population": 105995
  },
  {
    "rank": 300,
    "name": "Davie",
    "state": "FL",
    "population": 105691
  },
  {
    "rank": 301,
    "name": "San Mateo",
    "state": "CA",
    "population": 105661
  },
  {
    "rank": 302,
    "name": "Brockton",
    "state": "MA",
    "population": 105643
  },
  {
    "rank": 303,
    "name": "Concord",
    "state": "NC",
    "population": 105240
  },
  {
    "rank": 304,
    "name": "Jurupa Valley",
    "state": "CA",
    "population": 105053
  },
  {
    "rank": 305,
    "name": "Daly City",
    "state": "CA",
    "population": 104901
  },
  {
    "rank": 306,
    "name": "Allen",
    "state": "TX",
    "population": 104627
  },
  {
    "rank": 307,
    "name": "Rio Rancho",
    "state": "NM",
    "population": 104046
  },
  {
    "rank": 308,
    "name": "Rialto",
    "state": "CA",
    "population": 104026
  },
  {
    "rank": 309,
    "name": "Woodbridge",
    "state": "NJ",
    "population": 103639
  },
  {
    "rank": 310,
    "name": "South Bend",
    "state": "IN",
    "population": 103453
  },
  {
    "rank": 311,
    "name": "Spokane Valley",
    "state": "WA",
    "population": 102976
  },
  {
    "rank": 312,
    "name": "Norwalk",
    "state": "CA",
    "population": 102773
  },
  {
    "rank": 313,
    "name": "Menifee",
    "state": "CA",
    "population": 102527
  },
  {
    "rank": 314,
    "name": "Vacaville",
    "state": "CA",
    "population": 102386
  },
  {
    "rank": 315,
    "name": "Wichita Falls",
    "state": "TX",
    "population": 102316
  },
  {
    "rank": 316,
    "name": "Davenport",
    "state": "IA",
    "population": 101724
  },
  {
    "rank": 317,
    "name": "Quincy",
    "state": "MA",
    "population": 101636
  },
  {
    "rank": 318,
    "name": "Chico",
    "state": "CA",
    "population": 101475
  },
  {
    "rank": 319,
    "name": "Lynn",
    "state": "MA",
    "population": 101253
  },
  {
    "rank": 320,
    "name": "Lees Summit",
    "state": "MO",
    "population": 101108
  },
  {
    "rank": 321,
    "name": "New Bedford",
    "state": "MA",
    "population": 101079
  },
  {
    "rank": 322,
    "name": "Federal Way",
    "state": "WA",
    "population": 101030
  },
  {
    "rank": 323,
    "name": "Clinton",
    "state": "MI",
    "population": 100513
  },
  {
    "rank": 324,
    "name": "Edinburg",
    "state": "TX",
    "population": 100243
  },
  {
    "rank": 325,
    "name": "Nampa",
    "state": "ID",
    "population": 100200
  },
  {
    "rank": 326,
    "name": "Roanoke",
    "state": "VA",
    "population": 100011
  },
  {
    "rank": 327,
    "name": "Kenosha",
    "state": "WI",
    "population": 99986
  },
  {
    "rank": 328,
    "name": "San Angelo",
    "state": "TX",
    "population": 99893
  },
  {
    "rank": 329,
    "name": "Hesperia",
    "state": "CA",
    "population": 99818
  },
  {
    "rank": 330,
    "name": "Carmel",
    "state": "IN",
    "population": 99757
  },
  {
    "rank": 331,
    "name": "Tuscaloosa",
    "state": "AL",
    "population": 99600
  },
  {
    "rank": 332,
    "name": "Albany",
    "state": "NY",
    "population": 99224
  },
  {
    "rank": 333,
    "name": "Bend",
    "state": "OR",
    "population": 99178
  },
  {
    "rank": 334,
    "name": "Fishers",
    "state": "IN",
    "population": 98977
  },
  {
    "rank": 335,
    "name": "Longmont",
    "state": "CO",
    "population": 98885
  },
  {
    "rank": 336,
    "name": "Canton",
    "state": "MI",
    "population": 98659
  },
  {
    "rank": 337,
    "name": "Vista",
    "state": "CA",
    "population": 98381
  },
  {
    "rank": 338,
    "name": "Orem",
    "state": "UT",
    "population": 98129
  },
  {
    "rank": 339,
    "name": "Portsmouth",
    "state": "VA",
    "population": 97915
  },
  {
    "rank": 340,
    "name": "Beaverton",
    "state": "OR",
    "population": 97494
  },
  {
    "rank": 341,
    "name": "Boca Raton",
    "state": "FL",
    "population": 97422
  },
  {
    "rank": 342,
    "name": "Sunrise",
    "state": "FL",
    "population": 97335
  },
  {
    "rank": 343,
    "name": "Yakima",
    "state": "WA",
    "population": 96968
  },
  {
    "rank": 344,
    "name": "Sandy",
    "state": "UT",
    "population": 96904
  },
  {
    "rank": 345,
    "name": "Compton",
    "state": "CA",
    "population": 95740
  },
  {
    "rank": 346,
    "name": "Carson",
    "state": "CA",
    "population": 95558
  },
  {
    "rank": 347,
    "name": "Yuma",
    "state": "AZ",
    "population": 95548
  },
  {
    "rank": 348,
    "name": "Livonia",
    "state": "MI",
    "population": 95535
  },
  {
    "rank": 349,
    "name": "Toms River",
    "state": "NJ",
    "population": 95438
  },
  {
    "rank": 350,
    "name": "St George",
    "state": "UT",
    "population": 95342
  },
  {
    "rank": 351,
    "name": "Goodyear",
    "state": "AZ",
    "population": 95294
  },
  {
    "rank": 352,
    "name": "Reading",
    "state": "PA",
    "population": 95112
  },
  {
    "rank": 353,
    "name": "Lawrence",
    "state": "KS",
    "population": 94934
  },
  {
    "rank": 354,
    "name": "San Marcos",
    "state": "CA",
    "population": 94833
  },
  {
    "rank": 355,
    "name": "Erie",
    "state": "PA",
    "population": 94831
  },
  {
    "rank": 356,
    "name": "Asheville",
    "state": "NC",
    "population": 94589
  },
  {
    "rank": 357,
    "name": "Edmond",
    "state": "OK",
    "population": 94428
  },
  {
    "rank": 358,
    "name": "Suffolk",
    "state": "VA",
    "population": 94324
  },
  {
    "rank": 359,
    "name": "Fall River",
    "state": "MA",
    "population": 94000
  },
  {
    "rank": 360,
    "name": "Fayetteville",
    "state": "AR",
    "population": 93949
  },
  {
    "rank": 361,
    "name": "Deltona",
    "state": "FL",
    "population": 93692
  },
  {
    "rank": 362,
    "name": "Mission Viejo",
    "state": "CA",
    "population": 93653
  },
  {
    "rank": 363,
    "name": "Redding",
    "state": "CA",
    "population": 93611
  },
  {
    "rank": 364,
    "name": "Santa Monica",
    "state": "CA",
    "population": 93076
  },
  {
    "rank": 365,
    "name": "Tracy",
    "state": "CA",
    "population": 93000
  },
  {
    "rank": 366,
    "name": "Roswell",
    "state": "GA",
    "population": 92833
  },
  {
    "rank": 367,
    "name": "South Gate",
    "state": "CA",
    "population": 92726
  },
  {
    "rank": 368,
    "name": "Hoover",
    "state": "AL",
    "population": 92606
  },
  {
    "rank": 369,
    "name": "Hamilton",
    "state": "NJ",
    "population": 92297
  },
  {
    "rank": 370,
    "name": "Kirkland",
    "state": "WA",
    "population": 92175
  },
  {
    "rank": 371,
    "name": "Plantation",
    "state": "FL",
    "population": 91750
  },
  {
    "rank": 372,
    "name": "Buckeye",
    "state": "AZ",
    "population": 91502
  },
  {
    "rank": 373,
    "name": "Bellingham",
    "state": "WA",
    "population": 91482
  },
  {
    "rank": 374,
    "name": "Chino",
    "state": "CA",
    "population": 91403
  },
  {
    "rank": 375,
    "name": "Nashua",
    "state": "NH",
    "population": 91322
  },
  {
    "rank": 376,
    "name": "OFallon",
    "state": "MO",
    "population": 91316
  },
  {
    "rank": 377,
    "name": "Norwalk",
    "state": "CT",
    "population": 91184
  },
  {
    "rank": 378,
    "name": "San Leandro",
    "state": "CA",
    "population": 91008
  },
  {
    "rank": 379,
    "name": "Westminster",
    "state": "CA",
    "population": 90911
  },
  {
    "rank": 380,
    "name": "Trenton",
    "state": "NJ",
    "population": 90871
  },
  {
    "rank": 381,
    "name": "Mount Pleasant",
    "state": "SC",
    "population": 90801
  },
  {
    "rank": 382,
    "name": "New Braunfels",
    "state": "TX",
    "population": 90403
  },
  {
    "rank": 383,
    "name": "Lawton",
    "state": "OK",
    "population": 90381
  },
  {
    "rank": 384,
    "name": "Clifton",
    "state": "NJ",
    "population": 90296
  },
  {
    "rank": 385,
    "name": "Bloomington",
    "state": "MN",
    "population": 89987
  },
  {
    "rank": 386,
    "name": "Conroe",
    "state": "TX",
    "population": 89956
  },
  {
    "rank": 387,
    "name": "Hemet",
    "state": "CA",
    "population": 89833
  },
  {
    "rank": 388,
    "name": "Avondale",
    "state": "AZ",
    "population": 89334
  },
  {
    "rank": 389,
    "name": "Waukegan",
    "state": "IL",
    "population": 89321
  },
  {
    "rank": 390,
    "name": "Palm Coast",
    "state": "FL",
    "population": 89258
  },
  {
    "rank": 391,
    "name": "Lawrence",
    "state": "MA",
    "population": 89143
  },
  {
    "rank": 392,
    "name": "Fort Smith",
    "state": "AR",
    "population": 89142
  },
  {
    "rank": 393,
    "name": "Indio",
    "state": "CA",
    "population": 89137
  },
  {
    "rank": 394,
    "name": "Newton",
    "state": "MA",
    "population": 88923
  },
  {
    "rank": 395,
    "name": "Santa Barbara",
    "state": "CA",
    "population": 88665
  },
  {
    "rank": 396,
    "name": "Champaign",
    "state": "IL",
    "population": 88302
  },
  {
    "rank": 397,
    "name": "Hawthorne",
    "state": "CA",
    "population": 88083
  },
  {
    "rank": 398,
    "name": "Livermore",
    "state": "CA",
    "population": 87955
  },
  {
    "rank": 399,
    "name": "Citrus Heights",
    "state": "CA",
    "population": 87583
  },
  {
    "rank": 400,
    "name": "Greenville",
    "state": "NC",
    "population": 87521
  },
  {
    "rank": 401,
    "name": "Santa Fe",
    "state": "NM",
    "population": 87505
  },
  {
    "rank": 402,
    "name": "Ogden",
    "state": "UT",
    "population": 87321
  },
  {
    "rank": 403,
    "name": "Whittier",
    "state": "CA",
    "population": 87306
  },
  {
    "rank": 404,
    "name": "Troy",
    "state": "MI",
    "population": 87294
  },
  {
    "rank": 405,
    "name": "Auburn",
    "state": "WA",
    "population": 87256
  },
  {
    "rank": 406,
    "name": "Deerfield Beach",
    "state": "FL",
    "population": 86859
  },
  {
    "rank": 407,
    "name": "Duluth",
    "state": "MN",
    "population": 86697
  },
  {
    "rank": 408,
    "name": "Danbury",
    "state": "CT",
    "population": 86518
  },
  {
    "rank": 409,
    "name": "Brooklyn Park",
    "state": "MN",
    "population": 86478
  },
  {
    "rank": 410,
    "name": "Fort Myers",
    "state": "FL",
    "population": 86395
  },
  {
    "rank": 411,
    "name": "Merced",
    "state": "CA",
    "population": 86333
  },
  {
    "rank": 412,
    "name": "Lake Forest",
    "state": "CA",
    "population": 85858
  },
  {
    "rank": 413,
    "name": "Medford",
    "state": "OR",
    "population": 85824
  },
  {
    "rank": 414,
    "name": "Sioux City",
    "state": "IA",
    "population": 85797
  },
  {
    "rank": 415,
    "name": "Mission",
    "state": "TX",
    "population": 85778
  },
  {
    "rank": 416,
    "name": "Westland",
    "state": "MI",
    "population": 85420
  },
  {
    "rank": 417,
    "name": "Cicero",
    "state": "IL",
    "population": 85268
  },
  {
    "rank": 418,
    "name": "Newport Beach",
    "state": "CA",
    "population": 85239
  },
  {
    "rank": 419,
    "name": "Lake Charles",
    "state": "LA",
    "population": 84872
  },
  {
    "rank": 420,
    "name": "Melbourne",
    "state": "FL",
    "population": 84678
  },
  {
    "rank": 421,
    "name": "San Ramon",
    "state": "CA",
    "population": 84605
  },
  {
    "rank": 422,
    "name": "Redwood City",
    "state": "CA",
    "population": 84292
  },
  {
    "rank": 423,
    "name": "Springdale",
    "state": "AR",
    "population": 84161
  },
  {
    "rank": 424,
    "name": "Buena Park",
    "state": "CA",
    "population": 84034
  },
  {
    "rank": 425,
    "name": "Farmington Hills",
    "state": "MI",
    "population": 83986
  },
  {
    "rank": 426,
    "name": "Bryan",
    "state": "TX",
    "population": 83980
  },
  {
    "rank": 427,
    "name": "Kennewick",
    "state": "WA",
    "population": 83921
  },
  {
    "rank": 428,
    "name": "Baytown",
    "state": "TX",
    "population": 83701
  },
  {
    "rank": 429,
    "name": "Manteca",
    "state": "CA",
    "population": 83498
  },
  {
    "rank": 430,
    "name": "Franklin",
    "state": "TN",
    "population": 83454
  },
  {
    "rank": 431,
    "name": "Cranston",
    "state": "RI",
    "population": 82934
  },
  {
    "rank": 432,
    "name": "Miami Beach",
    "state": "FL",
    "population": 82890
  },
  {
    "rank": 433,
    "name": "Alhambra",
    "state": "CA",
    "population": 82868
  },
  {
    "rank": 434,
    "name": "Warwick",
    "state": "RI",
    "population": 82823
  },
  {
    "rank": 435,
    "name": "Lakewood",
    "state": "CA",
    "population": 82496
  },
  {
    "rank": 436,
    "name": "Largo",
    "state": "FL",
    "population": 82485
  },
  {
    "rank": 437,
    "name": "Johns Creek",
    "state": "GA",
    "population": 82453
  },
  {
    "rank": 438,
    "name": "Mountain View",
    "state": "CA",
    "population": 82376
  },
  {
    "rank": 439,
    "name": "Temple",
    "state": "TX",
    "population": 82073
  },
  {
    "rank": 440,
    "name": "Layton",
    "state": "UT",
    "population": 81773
  },
  {
    "rank": 441,
    "name": "Longview",
    "state": "TX",
    "population": 81638
  },
  {
    "rank": 442,
    "name": "Flint",
    "state": "MI",
    "population": 81252
  },
  {
    "rank": 443,
    "name": "Parma",
    "state": "OH",
    "population": 81146
  },
  {
    "rank": 444,
    "name": "Somerville",
    "state": "MA",
    "population": 81045
  },
  {
    "rank": 445,
    "name": "Plymouth",
    "state": "MN",
    "population": 81026
  },
  {
    "rank": 446,
    "name": "Homestead",
    "state": "FL",
    "population": 80737
  },
  {
    "rank": 447,
    "name": "Folsom",
    "state": "CA",
    "population": 80454
  },
  {
    "rank": 448,
    "name": "Gastonia",
    "state": "NC",
    "population": 80411
  },
  {
    "rank": 449,
    "name": "Boynton Beach",
    "state": "FL",
    "population": 80380
  },
  {
    "rank": 450,
    "name": "Warner Robins",
    "state": "GA",
    "population": 80308
  },
  {
    "rank": 451,
    "name": "Tustin",
    "state": "CA",
    "population": 80276
  },
  {
    "rank": 452,
    "name": "Milpitas",
    "state": "CA",
    "population": 80273
  },
  {
    "rank": 453,
    "name": "Pleasanton",
    "state": "CA",
    "population": 79871
  },
  {
    "rank": 454,
    "name": "New Rochelle",
    "state": "NY",
    "population": 79726
  },
  {
    "rank": 455,
    "name": "Pharr",
    "state": "TX",
    "population": 79715
  },
  {
    "rank": 456,
    "name": "Shelby",
    "state": "MI",
    "population": 79408
  },
  {
    "rank": 457,
    "name": "Rancho Cordova",
    "state": "CA",
    "population": 79332
  },
  {
    "rank": 458,
    "name": "Napa",
    "state": "CA",
    "population": 79246
  },
  {
    "rank": 459,
    "name": "Kissimmee",
    "state": "FL",
    "population": 79226
  },
  {
    "rank": 460,
    "name": "Bellflower",
    "state": "CA",
    "population": 79190
  },
  {
    "rank": 461,
    "name": "Bloomington",
    "state": "IN",
    "population": 79168
  },
  {
    "rank": 462,
    "name": "Upland",
    "state": "CA",
    "population": 79040
  },
  {
    "rank": 463,
    "name": "Lynchburg",
    "state": "VA",
    "population": 79009
  },
  {
    "rank": 464,
    "name": "Schaumburg",
    "state": "IL",
    "population": 78723
  },
  {
    "rank": 465,
    "name": "Perris",
    "state": "CA",
    "population": 78700
  },
  {
    "rank": 466,
    "name": "Bloomington",
    "state": "IL",
    "population": 78680
  },
  {
    "rank": 467,
    "name": "Jonesboro",
    "state": "AR",
    "population": 78576
  },
  {
    "rank": 468,
    "name": "Chino Hills",
    "state": "CA",
    "population": 78411
  },
  {
    "rank": 469,
    "name": "Alameda",
    "state": "CA",
    "population": 78280
  },
  {
    "rank": 470,
    "name": "Frederick",
    "state": "MD",
    "population": 78171
  },
  {
    "rank": 471,
    "name": "Evanston",
    "state": "IL",
    "population": 78110
  },
  {
    "rank": 472,
    "name": "Hammond",
    "state": "IN",
    "population": 77879
  },
  {
    "rank": 473,
    "name": "Racine",
    "state": "WI",
    "population": 77816
  },
  {
    "rank": 474,
    "name": "Arlington Heights",
    "state": "IL",
    "population": 77676
  },
  {
    "rank": 475,
    "name": "Cedar Park",
    "state": "TX",
    "population": 77595
  },
  {
    "rank": 476,
    "name": "South Jordan",
    "state": "UT",
    "population": 77487
  },
  {
    "rank": 477,
    "name": "Pasco",
    "state": "WA",
    "population": 77108
  },
  {
    "rank": 478,
    "name": "Flagstaff",
    "state": "AZ",
    "population": 76831
  },
  {
    "rank": 479,
    "name": "Southfield",
    "state": "MI",
    "population": 76618
  },
  {
    "rank": 480,
    "name": "Wyoming",
    "state": "MI",
    "population": 76501
  },
  {
    "rank": 481,
    "name": "Pittsburg",
    "state": "CA",
    "population": 76416
  },
  {
    "rank": 482,
    "name": "Loveland",
    "state": "CO",
    "population": 76378
  },
  {
    "rank": 483,
    "name": "Scranton",
    "state": "PA",
    "population": 76328
  },
  {
    "rank": 484,
    "name": "Rochester Hills",
    "state": "MI",
    "population": 76300
  },
  {
    "rank": 485,
    "name": "Auburn",
    "state": "AL",
    "population": 76143
  },
  {
    "rank": 486,
    "name": "Flower Mound",
    "state": "TX",
    "population": 75956
  },
  {
    "rank": 487,
    "name": "Lehi",
    "state": "UT",
    "population": 75907
  },
  {
    "rank": 488,
    "name": "Doral",
    "state": "FL",
    "population": 75874
  },
  {
    "rank": 489,
    "name": "Apple Valley",
    "state": "CA",
    "population": 75791
  },
  {
    "rank": 490,
    "name": "Bethlehem",
    "state": "PA",
    "population": 75781
  },
  {
    "rank": 491,
    "name": "Appleton",
    "state": "WI",
    "population": 75644
  },
  {
    "rank": 492,
    "name": "Pawtucket",
    "state": "RI",
    "population": 75604
  },
  {
    "rank": 493,
    "name": "Woodbury",
    "state": "MN",
    "population": 75102
  },
  {
    "rank": 494,
    "name": "Iowa City",
    "state": "IA",
    "population": 74828
  },
  {
    "rank": 495,
    "name": "North Port",
    "state": "FL",
    "population": 74793
  },
  {
    "rank": 496,
    "name": "Rapid City",
    "state": "SD",
    "population": 74703
  },
  {
    "rank": 497,
    "name": "Cherry Hill",
    "state": "NJ",
    "population": 74553
  },
  {
    "rank": 498,
    "name": "Lauderhill",
    "state": "FL",
    "population": 74482
  },
  {
    "rank": 499,
    "name": "Rock Hill",
    "state": "SC",
    "population": 74372
  },
  {
    "rank": 500,
    "name": "Missouri City",
    "state": "TX",
    "population": 74259
  },
  {
    "rank": 501,
    "name": "New Britain",
    "state": "CT",
    "population": 74135
  },
  {
    "rank": 502,
    "name": "Broomfield",
    "state": "CO",
    "population": 74112
  },
  {
    "rank": 503,
    "name": "Bolingbrook",
    "state": "IL",
    "population": 73922
  },
  {
    "rank": 504,
    "name": "Mount Vernon",
    "state": "NY",
    "population": 73893
  },
  {
    "rank": 505,
    "name": "Bismarck",
    "state": "ND",
    "population": 73622
  },
  {
    "rank": 506,
    "name": "Brick",
    "state": "NJ",
    "population": 73620
  },
  {
    "rank": 507,
    "name": "Kalamazoo",
    "state": "MI",
    "population": 73598
  },
  {
    "rank": 508,
    "name": "Missoula",
    "state": "MT",
    "population": 73489
  },
  {
    "rank": 509,
    "name": "Redmond",
    "state": "WA",
    "population": 73256
  },
  {
    "rank": 510,
    "name": "Redlands",
    "state": "CA",
    "population": 73168
  },
  {
    "rank": 511,
    "name": "Castle Rock",
    "state": "CO",
    "population": 73158
  },
  {
    "rank": 512,
    "name": "Gulfport",
    "state": "MS",
    "population": 72926
  },
  {
    "rank": 513,
    "name": "Turlock",
    "state": "CA",
    "population": 72740
  },
  {
    "rank": 514,
    "name": "Jacksonville",
    "state": "NC",
    "population": 72723
  },
  {
    "rank": 515,
    "name": "Daytona Beach",
    "state": "FL",
    "population": 72647
  },
  {
    "rank": 516,
    "name": "Mansfield",
    "state": "TX",
    "population": 72602
  },
  {
    "rank": 517,
    "name": "Dublin",
    "state": "CA",
    "population": 72589
  },
  {
    "rank": 518,
    "name": "St Joseph",
    "state": "MO",
    "population": 72473
  },
  {
    "rank": 519,
    "name": "Framingham",
    "state": "MA",
    "population": 72362
  },
  {
    "rank": 520,
    "name": "Bowling Green",
    "state": "KY",
    "population": 72294
  },
  {
    "rank": 521,
    "name": "Baldwin Park",
    "state": "CA",
    "population": 72176
  },
  {
    "rank": 522,
    "name": "Tamarac",
    "state": "FL",
    "population": 71897
  },
  {
    "rank": 523,
    "name": "Harlingen",
    "state": "TX",
    "population": 71829
  },
  {
    "rank": 524,
    "name": "Camden",
    "state": "NJ",
    "population": 71791
  },
  {
    "rank": 525,
    "name": "Bayonne",
    "state": "NJ",
    "population": 71686
  },
  {
    "rank": 526,
    "name": "Rocklin",
    "state": "CA",
    "population": 71601
  },
  {
    "rank": 527,
    "name": "Redondo Beach",
    "state": "CA",
    "population": 71576
  },
  {
    "rank": 528,
    "name": "Waukesha",
    "state": "WI",
    "population": 71158
  },
  {
    "rank": 529,
    "name": "Dothan",
    "state": "AL",
    "population": 71072
  },
  {
    "rank": 530,
    "name": "Johnson City",
    "state": "TN",
    "population": 71046
  },
  {
    "rank": 531,
    "name": "Wilmington",
    "state": "DE",
    "population": 70898
  },
  {
    "rank": 532,
    "name": "Canton",
    "state": "OH",
    "population": 70872
  },
  {
    "rank": 533,
    "name": "Lafayette",
    "state": "IN",
    "population": 70783
  },
  {
    "rank": 534,
    "name": "Camarillo",
    "state": "CA",
    "population": 70741
  },
  {
    "rank": 535,
    "name": "Greenville",
    "state": "SC",
    "population": 70720
  },
  {
    "rank": 536,
    "name": "Marysville",
    "state": "WA",
    "population": 70714
  },
  {
    "rank": 537,
    "name": "Waterford",
    "state": "MI",
    "population": 70565
  },
  {
    "rank": 538,
    "name": "Passaic",
    "state": "NJ",
    "population": 70537
  },
  {
    "rank": 539,
    "name": "Decatur",
    "state": "IL",
    "population": 70522
  },
  {
    "rank": 540,
    "name": "St Charles",
    "state": "MO",
    "population": 70493
  },
  {
    "rank": 541,
    "name": "Lake Elsinore",
    "state": "CA",
    "population": 70265
  },
  {
    "rank": 542,
    "name": "Maple Grove",
    "state": "MN",
    "population": 70253
  },
  {
    "rank": 543,
    "name": "Blaine",
    "state": "MN",
    "population": 70222
  },
  {
    "rank": 544,
    "name": "Union City",
    "state": "CA",
    "population": 70143
  },
  {
    "rank": 545,
    "name": "Walnut Creek",
    "state": "CA",
    "population": 70127
  },
  {
    "rank": 546,
    "name": "Yuba City",
    "state": "CA",
    "population": 70117
  },
  {
    "rank": 547,
    "name": "North Richland Hills",
    "state": "TX",
    "population": 69917
  },
  {
    "rank": 548,
    "name": "Rogers",
    "state": "AR",
    "population": 69908
  },
  {
    "rank": 549,
    "name": "Eastvale",
    "state": "CA",
    "population": 69757
  },
  {
    "rank": 550,
    "name": "Gaithersburg",
    "state": "MD",
    "population": 69657
  },
  {
    "rank": 551,
    "name": "Albany",
    "state": "GA",
    "population": 69647
  },
  {
    "rank": 552,
    "name": "East Orange",
    "state": "NJ",
    "population": 69612
  },
  {
    "rank": 553,
    "name": "Noblesville",
    "state": "IN",
    "population": 69604
  },
  {
    "rank": 554,
    "name": "Lakeville",
    "state": "MN",
    "population": 69490
  },
  {
    "rank": 555,
    "name": "Eau Claire",
    "state": "WI",
    "population": 69421
  },
  {
    "rank": 556,
    "name": "Gary",
    "state": "IN",
    "population": 69093
  },
  {
    "rank": 557,
    "name": "St Cloud",
    "state": "MN",
    "population": 68881
  },
  {
    "rank": 558,
    "name": "Tulare",
    "state": "CA",
    "population": 68875
  },
  {
    "rank": 559,
    "name": "Eagan",
    "state": "MN",
    "population": 68855
  },
  {
    "rank": 560,
    "name": "West Des Moines",
    "state": "IA",
    "population": 68723
  },
  {
    "rank": 561,
    "name": "Union City",
    "state": "NJ",
    "population": 68589
  },
  {
    "rank": 562,
    "name": "Palo Alto",
    "state": "CA",
    "population": 68572
  },
  {
    "rank": 563,
    "name": "Portland",
    "state": "ME",
    "population": 68408
  },
  {
    "rank": 564,
    "name": "Franklin",
    "state": "NJ",
    "population": 68364
  },
  {
    "rank": 565,
    "name": "Yorba Linda",
    "state": "CA",
    "population": 68336
  },
  {
    "rank": 566,
    "name": "Jackson",
    "state": "TN",
    "population": 68205
  },
  {
    "rank": 567,
    "name": "Weston",
    "state": "FL",
    "population": 68107
  },
  {
    "rank": 568,
    "name": "Palatine",
    "state": "IL",
    "population": 67908
  },
  {
    "rank": 569,
    "name": "Ankeny",
    "state": "IA",
    "population": 67887
  },
  {
    "rank": 570,
    "name": "Skokie",
    "state": "IL",
    "population": 67824
  },
  {
    "rank": 571,
    "name": "Haverhill",
    "state": "MA",
    "population": 67787
  },
  {
    "rank": 572,
    "name": "San Marcos",
    "state": "TX",
    "population": 67553
  },
  {
    "rank": 573,
    "name": "Sammamish",
    "state": "WA",
    "population": 67455
  },
  {
    "rank": 574,
    "name": "Waterloo",
    "state": "IA",
    "population": 67314
  },
  {
    "rank": 575,
    "name": "Shawnee",
    "state": "KS",
    "population": 67311
  },
  {
    "rank": 576,
    "name": "Lynwood",
    "state": "CA",
    "population": 67265
  },
  {
    "rank": 577,
    "name": "Georgetown",
    "state": "TX",
    "population": 67176
  },
  {
    "rank": 578,
    "name": "Rockville",
    "state": "MD",
    "population": 67117
  },
  {
    "rank": 579,
    "name": "Middletown",
    "state": "NJ",
    "population": 67106
  },
  {
    "rank": 580,
    "name": "Schenectady",
    "state": "NY",
    "population": 67047
  },
  {
    "rank": 581,
    "name": "Old Bridge",
    "state": "NJ",
    "population": 66876
  },
  {
    "rank": 582,
    "name": "Davis",
    "state": "CA",
    "population": 66850
  },
  {
    "rank": 583,
    "name": "Delray Beach",
    "state": "FL",
    "population": 66846
  },
  {
    "rank": 584,
    "name": "Oshkosh",
    "state": "WI",
    "population": 66816
  },
  {
    "rank": 585,
    "name": "Kenner",
    "state": "LA",
    "population": 66448
  },
  {
    "rank": 586,
    "name": "Ames",
    "state": "IA",
    "population": 66427
  },
  {
    "rank": 587,
    "name": "Lodi",
    "state": "CA",
    "population": 66348
  },
  {
    "rank": 588,
    "name": "Malden",
    "state": "MA",
    "population": 66263
  },
  {
    "rank": 589,
    "name": "Novi",
    "state": "MI",
    "population": 66243
  },
  {
    "rank": 590,
    "name": "Madera",
    "state": "CA",
    "population": 66224
  },
  {
    "rank": 591,
    "name": "South San Francisco",
    "state": "CA",
    "population": 66105
  },
  {
    "rank": 592,
    "name": "Gloucester",
    "state": "NJ",
    "population": 66034
  },
  {
    "rank": 593,
    "name": "West Bloomfield",
    "state": "MI",
    "population": 65888
  },
  {
    "rank": 594,
    "name": "Alpharetta",
    "state": "GA",
    "population": 65818
  },
  {
    "rank": 595,
    "name": "Janesville",
    "state": "WI",
    "population": 65615
  },
  {
    "rank": 596,
    "name": "Grand Junction",
    "state": "CO",
    "population": 65560
  },
  {
    "rank": 597,
    "name": "Victoria",
    "state": "TX",
    "population": 65534
  },
  {
    "rank": 598,
    "name": "Utica",
    "state": "NY",
    "population": 65283
  },
  {
    "rank": 599,
    "name": "Waltham",
    "state": "MA",
    "population": 65218
  },
  {
    "rank": 600,
    "name": "Lorain",
    "state": "OH",
    "population": 65211
  },
  {
    "rank": 601,
    "name": "Muncie",
    "state": "IN",
    "population": 65194
  },
  {
    "rank": 602,
    "name": "Pflugerville",
    "state": "TX",
    "population": 65191
  },
  {
    "rank": 603,
    "name": "Cheyenne",
    "state": "WY",
    "population": 65132
  },
  {
    "rank": 604,
    "name": "Idaho Falls",
    "state": "ID",
    "population": 64818
  },
  {
    "rank": 605,
    "name": "North Little Rock",
    "state": "AR",
    "population": 64591
  },
  {
    "rank": 606,
    "name": "Laguna Niguel",
    "state": "CA",
    "population": 64355
  },
  {
    "rank": 607,
    "name": "Burnsville",
    "state": "MN",
    "population": 64317
  },
  {
    "rank": 608,
    "name": "San Clemente",
    "state": "CA",
    "population": 64293
  },
  {
    "rank": 609,
    "name": "Brentwood",
    "state": "CA",
    "population": 64292
  },
  {
    "rank": 610,
    "name": "Eden Prairie",
    "state": "MN",
    "population": 64198
  },
  {
    "rank": 611,
    "name": "Bellevue",
    "state": "NE",
    "population": 64176
  },
  {
    "rank": 612,
    "name": "Conway",
    "state": "AR",
    "population": 64134
  },
  {
    "rank": 613,
    "name": "West Hartford",
    "state": "CT",
    "population": 64083
  },
  {
    "rank": 614,
    "name": "Greenwood",
    "state": "IN",
    "population": 63830
  },
  {
    "rank": 615,
    "name": "Lakewood",
    "state": "WA",
    "population": 63612
  },
  {
    "rank": 616,
    "name": "Coon Rapids",
    "state": "MN",
    "population": 63599
  },
  {
    "rank": 617,
    "name": "Ocala",
    "state": "FL",
    "population": 63591
  },
  {
    "rank": 618,
    "name": "Greenwich",
    "state": "CT",
    "population": 63518
  },
  {
    "rank": 619,
    "name": "Taylor",
    "state": "MI",
    "population": 63409
  },
  {
    "rank": 620,
    "name": "Hamilton",
    "state": "OH",
    "population": 63399
  },
  {
    "rank": 621,
    "name": "Millcreek",
    "state": "UT",
    "population": 63380
  },
  {
    "rank": 622,
    "name": "North Bergen",
    "state": "NJ",
    "population": 63361
  },
  {
    "rank": 623,
    "name": "Dearborn Heights",
    "state": "MI",
    "population": 63292
  },
  {
    "rank": 624,
    "name": "Brookline",
    "state": "MA",
    "population": 63191
  },
  {
    "rank": 625,
    "name": "La Habra",
    "state": "CA",
    "population": 63097
  },
  {
    "rank": 626,
    "name": "Santa Cruz",
    "state": "CA",
    "population": 62956
  },
  {
    "rank": 627,
    "name": "Council Bluffs",
    "state": "IA",
    "population": 62799
  },
  {
    "rank": 628,
    "name": "Moore",
    "state": "OK",
    "population": 62793
  },
  {
    "rank": 629,
    "name": "Bossier City",
    "state": "LA",
    "population": 62701
  },
  {
    "rank": 630,
    "name": "Montebello",
    "state": "CA",
    "population": 62640
  },
  {
    "rank": 631,
    "name": "Porterville",
    "state": "CA",
    "population": 62623
  },
  {
    "rank": 632,
    "name": "Port Orange",
    "state": "FL",
    "population": 62596
  },
  {
    "rank": 633,
    "name": "Rowlett",
    "state": "TX",
    "population": 62535
  },
  {
    "rank": 634,
    "name": "Commerce City",
    "state": "CO",
    "population": 62418
  },
  {
    "rank": 635,
    "name": "Revere",
    "state": "MA",
    "population": 62186
  },
  {
    "rank": 636,
    "name": "Pico Rivera",
    "state": "CA",
    "population": 62088
  },
  {
    "rank": 637,
    "name": "Encinitas",
    "state": "CA",
    "population": 62007
  },
  {
    "rank": 638,
    "name": "Chapel Hill",
    "state": "NC",
    "population": 61960
  },
  {
    "rank": 639,
    "name": "Springfield",
    "state": "OR",
    "population": 61851
  },
  {
    "rank": 640,
    "name": "Hendersonville",
    "state": "TN",
    "population": 61753
  },
  {
    "rank": 641,
    "name": "Wellington",
    "state": "FL",
    "population": 61637
  },
  {
    "rank": 642,
    "name": "Pontiac",
    "state": "MI",
    "population": 61606
  },
  {
    "rank": 643,
    "name": "Fairfield",
    "state": "CT",
    "population": 61512
  },
  {
    "rank": 644,
    "name": "Huntersville",
    "state": "NC",
    "population": 61376
  },
  {
    "rank": 645,
    "name": "San Rafael",
    "state": "CA",
    "population": 61271
  },
  {
    "rank": 646,
    "name": "Plymouth",
    "state": "MA",
    "population": 61217
  },
  {
    "rank": 647,
    "name": "Irvington",
    "state": "NJ",
    "population": 61176
  },
  {
    "rank": 648,
    "name": "Hamden",
    "state": "CT",
    "population": 61169
  },
  {
    "rank": 649,
    "name": "La Mesa",
    "state": "CA",
    "population": 61121
  },
  {
    "rank": 650,
    "name": "Monterey Park",
    "state": "CA",
    "population": 61096
  },
  {
    "rank": 651,
    "name": "Sanford",
    "state": "FL",
    "population": 61051
  },
  {
    "rank": 652,
    "name": "Jupiter",
    "state": "FL",
    "population": 61047
  },
  {
    "rank": 653,
    "name": "Woodland",
    "state": "CA",
    "population": 61033
  },
  {
    "rank": 654,
    "name": "Euless",
    "state": "TX",
    "population": 61032
  },
  {
    "rank": 655,
    "name": "Gardena",
    "state": "CA",
    "population": 61027
  },
  {
    "rank": 656,
    "name": "Marietta",
    "state": "GA",
    "population": 60972
  },
  {
    "rank": 657,
    "name": "Meriden",
    "state": "CT",
    "population": 60850
  },
  {
    "rank": 658,
    "name": "Bristol",
    "state": "CT",
    "population": 60833
  },
  {
    "rank": 659,
    "name": "Piscataway",
    "state": "NJ",
    "population": 60804
  },
  {
    "rank": 660,
    "name": "Vineland",
    "state": "NJ",
    "population": 60780
  },
  {
    "rank": 661,
    "name": "Des Plaines",
    "state": "IL",
    "population": 60675
  },
  {
    "rank": 662,
    "name": "Richland",
    "state": "WA",
    "population": 60560
  },
  {
    "rank": 663,
    "name": "Taylorsville",
    "state": "UT",
    "population": 60448
  },
  {
    "rank": 664,
    "name": "Great Falls",
    "state": "MT",
    "population": 60442
  },
  {
    "rank": 665,
    "name": "Hoboken",
    "state": "NJ",
    "population": 60419
  },
  {
    "rank": 666,
    "name": "Cupertino",
    "state": "CA",
    "population": 60381
  },
  {
    "rank": 667,
    "name": "West Allis",
    "state": "WI",
    "population": 60325
  },
  {
    "rank": 668,
    "name": "North Miami",
    "state": "FL",
    "population": 60191
  },
  {
    "rank": 669,
    "name": "Owensboro",
    "state": "KY",
    "population": 60183
  },
  {
    "rank": 670,
    "name": "Youngstown",
    "state": "OH",
    "population": 60068
  },
  {
    "rank": 671,
    "name": "Santee",
    "state": "CA",
    "population": 60037
  },
  {
    "rank": 672,
    "name": "Caldwell",
    "state": "ID",
    "population": 59996
  },
  {
    "rank": 673,
    "name": "Corvallis",
    "state": "OR",
    "population": 59922
  },
  {
    "rank": 674,
    "name": "Petaluma",
    "state": "CA",
    "population": 59776
  },
  {
    "rank": 675,
    "name": "Union",
    "state": "NJ",
    "population": 59728
  },
  {
    "rank": 676,
    "name": "Manchester",
    "state": "CT",
    "population": 59713
  },
  {
    "rank": 677,
    "name": "Dubuque",
    "state": "IA",
    "population": 59667
  },
  {
    "rank": 678,
    "name": "Medford",
    "state": "MA",
    "population": 59659
  },
  {
    "rank": 679,
    "name": "Kokomo",
    "state": "IN",
    "population": 59604
  },
  {
    "rank": 680,
    "name": "White Plains",
    "state": "NY",
    "population": 59559
  },
  {
    "rank": 681,
    "name": "Gilroy",
    "state": "CA",
    "population": 59520
  },
  {
    "rank": 682,
    "name": "Queen Creek",
    "state": "AZ",
    "population": 59519
  },
  {
    "rank": 683,
    "name": "Taunton",
    "state": "MA",
    "population": 59408
  },
  {
    "rank": 684,
    "name": "Leander",
    "state": "TX",
    "population": 59202
  },
  {
    "rank": 685,
    "name": "Stonecrest",
    "state": "GA",
    "population": 59194
  },
  {
    "rank": 686,
    "name": "Palm Beach Gardens",
    "state": "FL",
    "population": 59182
  },
  {
    "rank": 687,
    "name": "Hempstead",
    "state": "NY",
    "population": 59169
  },
  {
    "rank": 688,
    "name": "Grand Forks",
    "state": "ND",
    "population": 59166
  },
  {
    "rank": 689,
    "name": "Casper",
    "state": "WY",
    "population": 59038
  },
  {
    "rank": 690,
    "name": "St Cloud",
    "state": "FL",
    "population": 58964
  },
  {
    "rank": 691,
    "name": "St Clair Shores",
    "state": "MI",
    "population": 58874
  },
  {
    "rank": 692,
    "name": "Apex",
    "state": "NC",
    "population": 58780
  },
  {
    "rank": 693,
    "name": "Margate",
    "state": "FL",
    "population": 58712
  },
  {
    "rank": 694,
    "name": "Orland Park",
    "state": "IL",
    "population": 58703
  },
  {
    "rank": 695,
    "name": "Springfield",
    "state": "OH",
    "population": 58662
  },
  {
    "rank": 696,
    "name": "Carson City",
    "state": "NV",
    "population": 58639
  },
  {
    "rank": 697,
    "name": "Shoreline",
    "state": "WA",
    "population": 58608
  },
  {
    "rank": 698,
    "name": "Blue Springs",
    "state": "MO",
    "population": 58603
  },
  {
    "rank": 699,
    "name": "Jackson",
    "state": "NJ",
    "population": 58544
  },
  {
    "rank": 700,
    "name": "Parker",
    "state": "CO",
    "population": 58512
  },
  {
    "rank": 701,
    "name": "Midwest City",
    "state": "OK",
    "population": 58409
  },
  {
    "rank": 702,
    "name": "Terre Haute",
    "state": "IN",
    "population": 58389
  },
  {
    "rank": 703,
    "name": "Oak Lawn",
    "state": "IL",
    "population": 58362
  },
  {
    "rank": 704,
    "name": "Bowie",
    "state": "MD",
    "population": 58329
  },
  {
    "rank": 705,
    "name": "Royal Oak",
    "state": "MI",
    "population": 58211
  },
  {
    "rank": 706,
    "name": "Maricopa",
    "state": "AZ",
    "population": 58125
  },
  {
    "rank": 707,
    "name": "Lancaster",
    "state": "PA",
    "population": 58039
  },
  {
    "rank": 708,
    "name": "Hanford",
    "state": "CA",
    "population": 57990
  },
  {
    "rank": 709,
    "name": "Decatur",
    "state": "AL",
    "population": 57938
  },
  {
    "rank": 710,
    "name": "Kettering",
    "state": "OH",
    "population": 57862
  },
  {
    "rank": 711,
    "name": "Coconut Creek",
    "state": "FL",
    "population": 57833
  },
  {
    "rank": 712,
    "name": "Bartlett",
    "state": "TN",
    "population": 57786
  },
  {
    "rank": 713,
    "name": "St Peters",
    "state": "MO",
    "population": 57732
  },
  {
    "rank": 714,
    "name": "Wylie",
    "state": "TX",
    "population": 57526
  },
  {
    "rank": 715,
    "name": "Weymouth",
    "state": "MA",
    "population": 57437
  },
  {
    "rank": 716,
    "name": "Lenexa",
    "state": "KS",
    "population": 57434
  },
  {
    "rank": 717,
    "name": "Burlington",
    "state": "NC",
    "population": 57303
  },
  {
    "rank": 718,
    "name": "Berwyn",
    "state": "IL",
    "population": 57250
  },
  {
    "rank": 719,
    "name": "Lake Havasu City",
    "state": "AZ",
    "population": 57144
  },
  {
    "rank": 720,
    "name": "Fountain Valley",
    "state": "CA",
    "population": 57047
  },
  {
    "rank": 721,
    "name": "Highland",
    "state": "CA",
    "population": 56999
  },
  {
    "rank": 722,
    "name": "Madison",
    "state": "AL",
    "population": 56933
  },
  {
    "rank": 723,
    "name": "Mount Prospect",
    "state": "IL",
    "population": 56852
  },
  {
    "rank": 724,
    "name": "Arcadia",
    "state": "CA",
    "population": 56681
  },
  {
    "rank": 725,
    "name": "Albany",
    "state": "OR",
    "population": 56472
  },
  {
    "rank": 726,
    "name": "Apple Valley",
    "state": "MN",
    "population": 56374
  },
  {
    "rank": 727,
    "name": "Pocatello",
    "state": "ID",
    "population": 56320
  },
  {
    "rank": 728,
    "name": "National City",
    "state": "CA",
    "population": 56173
  },
  {
    "rank": 729,
    "name": "Parsippany-Troy Hills",
    "state": "NJ",
    "population": 56162
  },
  {
    "rank": 730,
    "name": "DeSoto",
    "state": "TX",
    "population": 56145
  },
  {
    "rank": 731,
    "name": "Port Arthur",
    "state": "TX",
    "population": 56039
  },
  {
    "rank": 732,
    "name": "Tinley Park",
    "state": "IL",
    "population": 55971
  },
  {
    "rank": 733,
    "name": "Bradenton",
    "state": "FL",
    "population": 55698
  },
  {
    "rank": 734,
    "name": "Ypsilanti",
    "state": "MI",
    "population": 55670
  },
  {
    "rank": 735,
    "name": "Smyrna",
    "state": "GA",
    "population": 55663
  },
  {
    "rank": 736,
    "name": "Olympia",
    "state": "WA",
    "population": 55605
  },
  {
    "rank": 737,
    "name": "West Haven",
    "state": "CT",
    "population": 55584
  },
  {
    "rank": 738,
    "name": "Chicopee",
    "state": "MA",
    "population": 55560
  },
  {
    "rank": 739,
    "name": "Kingsport",
    "state": "TN",
    "population": 55442
  },
  {
    "rank": 740,
    "name": "Perth Amboy",
    "state": "NJ",
    "population": 55436
  },
  {
    "rank": 741,
    "name": "Valdosta",
    "state": "GA",
    "population": 55378
  },
  {
    "rank": 742,
    "name": "New Brunswick",
    "state": "NJ",
    "population": 55266
  },
  {
    "rank": 743,
    "name": "Brookhaven",
    "state": "GA",
    "population": 55161
  },
  {
    "rank": 744,
    "name": "Herriman",
    "state": "UT",
    "population": 55144
  },
  {
    "rank": 745,
    "name": "Diamond Bar",
    "state": "CA",
    "population": 55072
  },
  {
    "rank": 746,
    "name": "Huntington Park",
    "state": "CA",
    "population": 54883
  },
  {
    "rank": 747,
    "name": "Apopka",
    "state": "FL",
    "population": 54873
  },
  {
    "rank": 748,
    "name": "Sarasota",
    "state": "FL",
    "population": 54842
  },
  {
    "rank": 749,
    "name": "Wayne",
    "state": "NJ",
    "population": 54838
  },
  {
    "rank": 750,
    "name": "Anderson",
    "state": "IN",
    "population": 54788
  },
  {
    "rank": 751,
    "name": "Southaven",
    "state": "MS",
    "population": 54648
  },
  {
    "rank": 752,
    "name": "Coeur dAlene",
    "state": "ID",
    "population": 54628
  },
  {
    "rank": 753,
    "name": "Plainfield",
    "state": "NJ",
    "population": 54586
  },
  {
    "rank": 754,
    "name": "Oak Park",
    "state": "IL",
    "population": 54583
  },
  {
    "rank": 755,
    "name": "Yucaipa",
    "state": "CA",
    "population": 54542
  },
  {
    "rank": 756,
    "name": "Tigard",
    "state": "OR",
    "population": 54539
  },
  {
    "rank": 757,
    "name": "Peabody",
    "state": "MA",
    "population": 54481
  },
  {
    "rank": 758,
    "name": "Rocky Mount",
    "state": "NC",
    "population": 54341
  },
  {
    "rank": 759,
    "name": "Pensacola",
    "state": "FL",
    "population": 54312
  },
  {
    "rank": 760,
    "name": "Kentwood",
    "state": "MI",
    "population": 54304
  },
  {
    "rank": 761,
    "name": "Bentonville",
    "state": "AR",
    "population": 54164
  },
  {
    "rank": 762,
    "name": "Manhattan",
    "state": "KS",
    "population": 54100
  },
  {
    "rank": 763,
    "name": "Georgetown",
    "state": "MI",
    "population": 54091
  },
  {
    "rank": 764,
    "name": "Wheaton",
    "state": "IL",
    "population": 53970
  },
  {
    "rank": 765,
    "name": "Elkhart",
    "state": "IN",
    "population": 53923
  },
  {
    "rank": 766,
    "name": "West Sacramento",
    "state": "CA",
    "population": 53915
  },
  {
    "rank": 767,
    "name": "Colton",
    "state": "CA",
    "population": 53909
  },
  {
    "rank": 768,
    "name": "San Jacinto",
    "state": "CA",
    "population": 53898
  },
  {
    "rank": 769,
    "name": "Minnetonka",
    "state": "MN",
    "population": 53781
  },
  {
    "rank": 770,
    "name": "Paramount",
    "state": "CA",
    "population": 53733
  },
  {
    "rank": 771,
    "name": "Galveston",
    "state": "TX",
    "population": 53695
  },
  {
    "rank": 772,
    "name": "Casa Grande",
    "state": "AZ",
    "population": 53658
  },
  {
    "rank": 773,
    "name": "Bonita Springs",
    "state": "FL",
    "population": 53644
  },
  {
    "rank": 774,
    "name": "Howell",
    "state": "NJ",
    "population": 53537
  },
  {
    "rank": 775,
    "name": "Lacey",
    "state": "WA",
    "population": 53526
  },
  {
    "rank": 776,
    "name": "Edina",
    "state": "MN",
    "population": 53494
  },
  {
    "rank": 777,
    "name": "Bozeman",
    "state": "MT",
    "population": 53293
  },
  {
    "rank": 778,
    "name": "Novato",
    "state": "CA",
    "population": 53225
  },
  {
    "rank": 779,
    "name": "Grand Island",
    "state": "NE",
    "population": 53131
  },
  {
    "rank": 780,
    "name": "Kannapolis",
    "state": "NC",
    "population": 53114
  },
  {
    "rank": 781,
    "name": "Bloomfield",
    "state": "NJ",
    "population": 53105
  },
  {
    "rank": 782,
    "name": "Pinellas Park",
    "state": "FL",
    "population": 53093
  },
  {
    "rank": 783,
    "name": "Smyrna",
    "state": "TN",
    "population": 53070
  },
  {
    "rank": 784,
    "name": "Methuen",
    "state": "MA",
    "population": 53059
  },
  {
    "rank": 785,
    "name": "Beaumont",
    "state": "CA",
    "population": 53036
  },
  {
    "rank": 786,
    "name": "West New York",
    "state": "NJ",
    "population": 52912
  },
  {
    "rank": 787,
    "name": "Logan",
    "state": "UT",
    "population": 52778
  },
  {
    "rank": 788,
    "name": "Normal",
    "state": "IL",
    "population": 52736
  },
  {
    "rank": 789,
    "name": "Battle Creek",
    "state": "MI",
    "population": 52721
  },
  {
    "rank": 790,
    "name": "La Crosse",
    "state": "WI",
    "population": 52680
  },
  {
    "rank": 791,
    "name": "Elyria",
    "state": "OH",
    "population": 52656
  },
  {
    "rank": 792,
    "name": "Watsonville",
    "state": "CA",
    "population": 52590
  },
  {
    "rank": 793,
    "name": "Glendora",
    "state": "CA",
    "population": 52558
  },
  {
    "rank": 794,
    "name": "Florissant",
    "state": "MO",
    "population": 52533
  },
  {
    "rank": 795,
    "name": "Hoffman Estates",
    "state": "IL",
    "population": 52530
  },
  {
    "rank": 796,
    "name": "Stratford",
    "state": "CT",
    "population": 52355
  },
  {
    "rank": 797,
    "name": "Aliso Viejo",
    "state": "CA",
    "population": 52176
  },
  {
    "rank": 798,
    "name": "Burien",
    "state": "WA",
    "population": 52066
  },
  {
    "rank": 799,
    "name": "Marana",
    "state": "AZ",
    "population": 51908
  },
  {
    "rank": 800,
    "name": "Texas City",
    "state": "TX",
    "population": 51898
  },
  {
    "rank": 801,
    "name": "Placentia",
    "state": "CA",
    "population": 51824
  },
  {
    "rank": 802,
    "name": "Harrisonburg",
    "state": "VA",
    "population": 51814
  },
  {
    "rank": 803,
    "name": "Twin Falls",
    "state": "ID",
    "population": 51807
  },
  {
    "rank": 804,
    "name": "Joplin",
    "state": "MO",
    "population": 51762
  },
  {
    "rank": 805,
    "name": "Dunwoody",
    "state": "GA",
    "population": 51683
  },
  {
    "rank": 806,
    "name": "Cathedral City",
    "state": "CA",
    "population": 51493
  },
  {
    "rank": 807,
    "name": "Delano",
    "state": "CA",
    "population": 51428
  },
  {
    "rank": 808,
    "name": "Troy",
    "state": "NY",
    "population": 51401
  },
  {
    "rank": 809,
    "name": "Collierville",
    "state": "TN",
    "population": 51324
  },
  {
    "rank": 810,
    "name": "Enid",
    "state": "OK",
    "population": 51308
  },
  {
    "rank": 811,
    "name": "Covina",
    "state": "CA",
    "population": 51268
  },
  {
    "rank": 812,
    "name": "Rosemead",
    "state": "CA",
    "population": 51185
  },
  {
    "rank": 813,
    "name": "Palm Desert",
    "state": "CA",
    "population": 51163
  },
  {
    "rank": 814,
    "name": "Cuyahoga Falls",
    "state": "OH",
    "population": 51114
  },
  {
    "rank": 815,
    "name": "Mishawaka",
    "state": "IN",
    "population": 51063
  },
  {
    "rank": 816,
    "name": "East Hartford",
    "state": "CT",
    "population": 51045
  },
  {
    "rank": 817,
    "name": "Draper",
    "state": "UT",
    "population": 51017
  },
  {
    "rank": 818,
    "name": "Middletown",
    "state": "OH",
    "population": 50987
  },
  {
    "rank": 819,
    "name": "Lakewood",
    "state": "OH",
    "population": 50942
  },
  {
    "rank": 820,
    "name": "East Honolulu",
    "state": "HI",
    "population": 50922
  },
  {
    "rank": 821,
    "name": "Summerville",
    "state": "SC",
    "population": 50915
  },
  {
    "rank": 822,
    "name": "Murray",
    "state": "UT",
    "population": 50637
  },
  {
    "rank": 823,
    "name": "Grapevine",
    "state": "TX",
    "population": 50631
  },
  {
    "rank": 824,
    "name": "Milford",
    "state": "CT",
    "population": 50558
  },
  {
    "rank": 825,
    "name": "Columbus",
    "state": "IN",
    "population": 50474
  },
  {
    "rank": 826,
    "name": "Downers Grove",
    "state": "IL",
    "population": 50247
  },
  {
    "rank": 827,
    "name": "Mooresville",
    "state": "NC",
    "population": 50193
  },
  {
    "rank": 828,
    "name": "Cypress",
    "state": "CA",
    "population": 50151
  },
  {
    "rank": 829,
    "name": "Harrisburg",
    "state": "PA",
    "population": 50099
  },
  {
    "rank": 830,
    "name": "St Louis Park",
    "state": "MN",
    "population": 50010
  },
  {
    "rank": 831,
    "name": "Spring Hill",
    "state": "TN",
    "population": 50005
  },
  {
    "rank": 832,
    "name": "Azusa",
    "state": "CA",
    "population": 50000
  },
  {
    "rank": 833,
    "name": "Chesterfield",
    "state": "MO",
    "population": 49999
  },
  {
    "rank": 834,
    "name": "Newark",
    "state": "OH",
    "population": 49934
  },
  {
    "rank": 835,
    "name": "Sheboygan",
    "state": "WI",
    "population": 49929
  },
  {
    "rank": 836,
    "name": "Bedford",
    "state": "TX",
    "population": 49928
  },
  {
    "rank": 837,
    "name": "Lincoln",
    "state": "CA",
    "population": 49757
  },
  {
    "rank": 838,
    "name": "East Brunswick",
    "state": "NJ",
    "population": 49715
  },
  {
    "rank": 839,
    "name": "Euclid",
    "state": "OH",
    "population": 49692
  },
  {
    "rank": 840,
    "name": "Cerritos",
    "state": "CA",
    "population": 49578
  },
  {
    "rank": 841,
    "name": "Redford",
    "state": "MI",
    "population": 49504
  },
  {
    "rank": 842,
    "name": "Biloxi",
    "state": "MS",
    "population": 49449
  },
  {
    "rank": 843,
    "name": "Jeffersonville",
    "state": "IN",
    "population": 49447
  },
  {
    "rank": 844,
    "name": "Lawrence",
    "state": "IN",
    "population": 49370
  },
  {
    "rank": 845,
    "name": "Dublin",
    "state": "OH",
    "population": 49328
  },
  {
    "rank": 846,
    "name": "Ceres",
    "state": "CA",
    "population": 49302
  },
  {
    "rank": 847,
    "name": "Coral Gables",
    "state": "FL",
    "population": 49248
  },
  {
    "rank": 848,
    "name": "Winter Haven",
    "state": "FL",
    "population": 49219
  },
  {
    "rank": 849,
    "name": "Cedar Hill",
    "state": "TX",
    "population": 49148
  },
  {
    "rank": 850,
    "name": "Everett",
    "state": "MA",
    "population": 49075
  },
  {
    "rank": 851,
    "name": "Barnstable",
    "state": "MA",
    "population": 48916
  },
  {
    "rank": 852,
    "name": "Portage",
    "state": "MI",
    "population": 48891
  },
  {
    "rank": 853,
    "name": "Charleston",
    "state": "WV",
    "population": 48864
  },
  {
    "rank": 854,
    "name": "West Orange",
    "state": "NJ",
    "population": 48843
  },
  {
    "rank": 855,
    "name": "Poway",
    "state": "CA",
    "population": 48841
  },
  {
    "rank": 856,
    "name": "Titusville",
    "state": "FL",
    "population": 48789
  },
  {
    "rank": 857,
    "name": "Hattiesburg",
    "state": "MS",
    "population": 48730
  },
  {
    "rank": 858,
    "name": "Glenview",
    "state": "IL",
    "population": 48705
  },
  {
    "rank": 859,
    "name": "Washington",
    "state": "NJ",
    "population": 48677
  },
  {
    "rank": 860,
    "name": "Niagara Falls",
    "state": "NY",
    "population": 48671
  },
  {
    "rank": 861,
    "name": "Monroe",
    "state": "NJ",
    "population": 48594
  },
  {
    "rank": 862,
    "name": "Roswell",
    "state": "NM",
    "population": 48422
  },
  {
    "rank": 863,
    "name": "Stillwater",
    "state": "OK",
    "population": 48394
  },
  {
    "rank": 864,
    "name": "Wauwatosa",
    "state": "WI",
    "population": 48387
  },
  {
    "rank": 865,
    "name": "Minot",
    "state": "ND",
    "population": 48377
  },
  {
    "rank": 866,
    "name": "Leesburg",
    "state": "VA",
    "population": 48250
  },
  {
    "rank": 867,
    "name": "Bothell",
    "state": "WA",
    "population": 48161
  },
  {
    "rank": 868,
    "name": "La Mirada",
    "state": "CA",
    "population": 48008
  },
  {
    "rank": 869,
    "name": "Binghamton",
    "state": "NY",
    "population": 47969
  },
  {
    "rank": 870,
    "name": "Rancho Santa Margarita",
    "state": "CA",
    "population": 47949
  },
  {
    "rank": 871,
    "name": "Wilson",
    "state": "NC",
    "population": 47851
  },
  {
    "rank": 872,
    "name": "Egg Harbor",
    "state": "NJ",
    "population": 47842
  },
  {
    "rank": 873,
    "name": "East Lansing",
    "state": "MI",
    "population": 47741
  },
  {
    "rank": 874,
    "name": "Middletown",
    "state": "CT",
    "population": 47717
  },
  {
    "rank": 875,
    "name": "Roseville",
    "state": "MI",
    "population": 47710
  },
  {
    "rank": 876,
    "name": "Monroe",
    "state": "LA",
    "population": 47702
  },
  {
    "rank": 877,
    "name": "Burleson",
    "state": "TX",
    "population": 47641
  },
  {
    "rank": 878,
    "name": "Wake Forest",
    "state": "NC",
    "population": 47601
  },
  {
    "rank": 879,
    "name": "Mansfield",
    "state": "OH",
    "population": 47534
  },
  {
    "rank": 880,
    "name": "Newark",
    "state": "CA",
    "population": 47529
  },
  {
    "rank": 881,
    "name": "Mentor",
    "state": "OH",
    "population": 47450
  },
  {
    "rank": 882,
    "name": "Cleveland",
    "state": "TN",
    "population": 47356
  },
  {
    "rank": 883,
    "name": "Brea",
    "state": "CA",
    "population": 47325
  },
  {
    "rank": 884,
    "name": "Fort Pierce",
    "state": "FL",
    "population": 47297
  },
  {
    "rank": 885,
    "name": "Ocoee",
    "state": "FL",
    "population": 47295
  },
  {
    "rank": 886,
    "name": "Rockwall",
    "state": "TX",
    "population": 47251
  },
  {
    "rank": 887,
    "name": "East Providence",
    "state": "RI",
    "population": 47139
  },
  {
    "rank": 888,
    "name": "Oro Valley",
    "state": "AZ",
    "population": 47070
  },
  {
    "rank": 889,
    "name": "San Luis Obispo",
    "state": "CA",
    "population": 47063
  },
  {
    "rank": 890,
    "name": "South Brunswick",
    "state": "NJ",
    "population": 47043
  },
  {
    "rank": 891,
    "name": "Winter Garden",
    "state": "FL",
    "population": 46964
  },
  {
    "rank": 892,
    "name": "Salina",
    "state": "KS",
    "population": 46889
  },
  {
    "rank": 893,
    "name": "Huntington",
    "state": "WV",
    "population": 46842
  },
  {
    "rank": 894,
    "name": "Evesham",
    "state": "NJ",
    "population": 46826
  },
  {
    "rank": 895,
    "name": "Prescott Valley",
    "state": "AZ",
    "population": 46785
  },
  {
    "rank": 896,
    "name": "Farmington",
    "state": "NM",
    "population": 46624
  },
  {
    "rank": 897,
    "name": "Charlottesville",
    "state": "VA",
    "population": 46553
  },
  {
    "rank": 898,
    "name": "Beavercreek",
    "state": "OH",
    "population": 46549
  },
  {
    "rank": 899,
    "name": "Strongsville",
    "state": "OH",
    "population": 46491
  },
  {
    "rank": 900,
    "name": "Attleboro",
    "state": "MA",
    "population": 46461
  },
  {
    "rank": 901,
    "name": "Little Elm",
    "state": "TX",
    "population": 46453
  },
  {
    "rank": 902,
    "name": "Westfield",
    "state": "IN",
    "population": 46410
  },
  {
    "rank": 903,
    "name": "Arlington",
    "state": "MA",
    "population": 46308
  },
  {
    "rank": 904,
    "name": "Altamonte Springs",
    "state": "FL",
    "population": 46231
  },
  {
    "rank": 905,
    "name": "Haltom City",
    "state": "TX",
    "population": 46073
  },
  {
    "rank": 906,
    "name": "Hackensack",
    "state": "NJ",
    "population": 46030
  },
  {
    "rank": 907,
    "name": "Bridgewater",
    "state": "NJ",
    "population": 45977
  },
  {
    "rank": 908,
    "name": "Goose Creek",
    "state": "SC",
    "population": 45946
  },
  {
    "rank": 909,
    "name": "Huntsville",
    "state": "TX",
    "population": 45941
  },
  {
    "rank": 910,
    "name": "Prescott",
    "state": "AZ",
    "population": 45827
  },
  {
    "rank": 911,
    "name": "Elmhurst",
    "state": "IL",
    "population": 45786
  },
  {
    "rank": 912,
    "name": "Keller",
    "state": "TX",
    "population": 45776
  },
  {
    "rank": 913,
    "name": "Bountiful",
    "state": "UT",
    "population": 45762
  },
  {
    "rank": 914,
    "name": "Kyle",
    "state": "TX",
    "population": 45697
  },
  {
    "rank": 915,
    "name": "Littleton",
    "state": "CO",
    "population": 45652
  },
  {
    "rank": 916,
    "name": "Urbandale",
    "state": "IA",
    "population": 45580
  },
  {
    "rank": 917,
    "name": "Los Banos",
    "state": "CA",
    "population": 45532
  },
  {
    "rank": 918,
    "name": "Morgan Hill",
    "state": "CA",
    "population": 45483
  },
  {
    "rank": 919,
    "name": "Cutler Bay",
    "state": "FL",
    "population": 45425
  },
  {
    "rank": 920,
    "name": "Brentwood",
    "state": "TN",
    "population": 45373
  },
  {
    "rank": 921,
    "name": "Sayreville",
    "state": "NJ",
    "population": 45345
  },
  {
    "rank": 922,
    "name": "Cleveland Heights",
    "state": "OH",
    "population": 45312
  },
  {
    "rank": 923,
    "name": "Sierra Vista",
    "state": "AZ",
    "population": 45308
  },
  {
    "rank": 924,
    "name": "Pearl City",
    "state": "HI",
    "population": 45295
  },
  {
    "rank": 925,
    "name": "Riverton",
    "state": "UT",
    "population": 45285
  },
  {
    "rank": 926,
    "name": "Alexandria",
    "state": "LA",
    "population": 45275
  },
  {
    "rank": 927,
    "name": "Manchester",
    "state": "NJ",
    "population": 45115
  },
  {
    "rank": 928,
    "name": "Fairfield",
    "state": "OH",
    "population": 44907
  },
  {
    "rank": 929,
    "name": "Blacksburg",
    "state": "VA",
    "population": 44826
  },
  {
    "rank": 930,
    "name": "York",
    "state": "PA",
    "population": 44800
  },
  {
    "rank": 931,
    "name": "North Lauderdale",
    "state": "FL",
    "population": 44794
  },
  {
    "rank": 932,
    "name": "Plainfield",
    "state": "IL",
    "population": 44762
  },
  {
    "rank": 933,
    "name": "Burlington",
    "state": "VT",
    "population": 44743
  },
  {
    "rank": 934,
    "name": "Fond du Lac",
    "state": "WI",
    "population": 44678
  },
  {
    "rank": 935,
    "name": "Mount Laurel",
    "state": "NJ",
    "population": 44633
  },
  {
    "rank": 936,
    "name": "West Lafayette",
    "state": "IN",
    "population": 44595
  },
  {
    "rank": 937,
    "name": "Palm Springs",
    "state": "CA",
    "population": 44575
  },
  {
    "rank": 938,
    "name": "The Colony",
    "state": "TX",
    "population": 44534
  },
  {
    "rank": 939,
    "name": "Moorhead",
    "state": "MN",
    "population": 44505
  },
  {
    "rank": 940,
    "name": "Mankato",
    "state": "MN",
    "population": 44488
  },
  {
    "rank": 941,
    "name": "Salem",
    "state": "MA",
    "population": 44480
  },
  {
    "rank": 942,
    "name": "Lombard",
    "state": "IL",
    "population": 44476
  },
  {
    "rank": 943,
    "name": "Freeport",
    "state": "NY",
    "population": 44472
  },
  {
    "rank": 944,
    "name": "Lompoc",
    "state": "CA",
    "population": 44444
  },
  {
    "rank": 945,
    "name": "Gallatin",
    "state": "TN",
    "population": 44431
  },
  {
    "rank": 946,
    "name": "Wallingford",
    "state": "CT",
    "population": 44396
  },
  {
    "rank": 947,
    "name": "Rohnert Park",
    "state": "CA",
    "population": 44390
  },
  {
    "rank": 948,
    "name": "Wentzville",
    "state": "MO",
    "population": 44372
  },
  {
    "rank": 949,
    "name": "Wilkes Barre",
    "state": "PA",
    "population": 44328
  },
  {
    "rank": 950,
    "name": "El Centro",
    "state": "CA",
    "population": 44322
  },
  {
    "rank": 951,
    "name": "Bloomfield",
    "state": "MI",
    "population": 44253
  },
  {
    "rank": 952,
    "name": "Oakland Park",
    "state": "FL",
    "population": 44229
  },
  {
    "rank": 953,
    "name": "Saginaw",
    "state": "MI",
    "population": 44202
  },
  {
    "rank": 954,
    "name": "Hilo",
    "state": "HI",
    "population": 44186
  },
  {
    "rank": 955,
    "name": "Greenacres",
    "state": "FL",
    "population": 43990
  },
  {
    "rank": 956,
    "name": "Concord",
    "state": "NH",
    "population": 43976
  },
  {
    "rank": 957,
    "name": "Altoona",
    "state": "PA",
    "population": 43963
  },
  {
    "rank": 958,
    "name": "Campbell",
    "state": "CA",
    "population": 43959
  },
  {
    "rank": 959,
    "name": "Pittsfield",
    "state": "MA",
    "population": 43927
  },
  {
    "rank": 960,
    "name": "Meridian",
    "state": "MI",
    "population": 43916
  },
  {
    "rank": 961,
    "name": "San Bruno",
    "state": "CA",
    "population": 43908
  },
  {
    "rank": 962,
    "name": "North Brunswick",
    "state": "NJ",
    "population": 43905
  },
  {
    "rank": 963,
    "name": "Leominster",
    "state": "MA",
    "population": 43782
  },
  {
    "rank": 964,
    "name": "Berkeley",
    "state": "NJ",
    "population": 43754
  },
  {
    "rank": 965,
    "name": "Linden",
    "state": "NJ",
    "population": 43738
  },
  {
    "rank": 966,
    "name": "Shakopee",
    "state": "MN",
    "population": 43698
  },
  {
    "rank": 967,
    "name": "North Miami Beach",
    "state": "FL",
    "population": 43676
  },
  {
    "rank": 968,
    "name": "Sherman",
    "state": "TX",
    "population": 43645
  },
  {
    "rank": 969,
    "name": "Eagle Mountain",
    "state": "UT",
    "population": 43623
  },
  {
    "rank": 970,
    "name": "Danville",
    "state": "CA",
    "population": 43582
  },
  {
    "rank": 971,
    "name": "Hagerstown",
    "state": "MD",
    "population": 43527
  },
  {
    "rank": 972,
    "name": "Bremerton",
    "state": "WA",
    "population": 43505
  },
  {
    "rank": 973,
    "name": "Southington",
    "state": "CT",
    "population": 43501
  },
  {
    "rank": 974,
    "name": "Hickory",
    "state": "NC",
    "population": 43490
  },
  {
    "rank": 975,
    "name": "Waipahu",
    "state": "HI",
    "population": 43485
  },
  {
    "rank": 976,
    "name": "Sumter",
    "state": "SC",
    "population": 43463
  },
  {
    "rank": 977,
    "name": "Huber Heights",
    "state": "OH",
    "population": 43439
  },
  {
    "rank": 978,
    "name": "Oakley",
    "state": "CA",
    "population": 43357
  },
  {
    "rank": 979,
    "name": "Hillsborough",
    "state": "NJ",
    "population": 43276
  },
  {
    "rank": 980,
    "name": "Woonsocket",
    "state": "RI",
    "population": 43240
  },
  {
    "rank": 981,
    "name": "Jefferson City",
    "state": "MO",
    "population": 43228
  },
  {
    "rank": 982,
    "name": "Buffalo Grove",
    "state": "IL",
    "population": 43212
  },
  {
    "rank": 983,
    "name": "Ormond Beach",
    "state": "FL",
    "population": 43080
  },
  {
    "rank": 984,
    "name": "Commerce",
    "state": "MI",
    "population": 43058
  },
  {
    "rank": 985,
    "name": "Clermont",
    "state": "FL",
    "population": 43021
  },
  {
    "rank": 986,
    "name": "Moline",
    "state": "IL",
    "population": 42985
  },
  {
    "rank": 987,
    "name": "Coppell",
    "state": "TX",
    "population": 42983
  },
  {
    "rank": 988,
    "name": "Puyallup",
    "state": "WA",
    "population": 42973
  },
  {
    "rank": 989,
    "name": "Edmonds",
    "state": "WA",
    "population": 42853
  },
  {
    "rank": 990,
    "name": "Manassas",
    "state": "VA",
    "population": 42772
  },
  {
    "rank": 991,
    "name": "Beverly",
    "state": "MA",
    "population": 42670
  },
  {
    "rank": 992,
    "name": "Spanish Fork",
    "state": "UT",
    "population": 42602
  },
  {
    "rank": 993,
    "name": "Danville",
    "state": "VA",
    "population": 42590
  },
  {
    "rank": 994,
    "name": "Newnan",
    "state": "GA",
    "population": 42549
  },
  {
    "rank": 995,
    "name": "Midland",
    "state": "MI",
    "population": 42547
  },
  {
    "rank": 996,
    "name": "Belleville",
    "state": "IL",
    "population": 42404
  },
  {
    "rank": 997,
    "name": "Gainesville",
    "state": "GA",
    "population": 42296
  },
  {
    "rank": 998,
    "name": "Rancho Palos Verdes",
    "state": "CA",
    "population": 42287
  },
  {
    "rank": 999,
    "name": "Peachtree Corners",
    "state": "GA",
    "population": 42243
  },
  {
    "rank": 1000,
    "name": "Lake Worth Beach",
    "state": "FL",
    "population": 42219
  }
 ]


export {
    City, SEED_DATA
}

